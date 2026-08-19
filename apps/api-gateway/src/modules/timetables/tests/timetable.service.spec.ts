import { Test, TestingModule } from '@nestjs/testing';
import { TimetableService } from '../services/timetable.service';
import { TimetableRepository } from '../repositories/timetable.repository';
import { BellScheduleRepository } from '../repositories/bell-schedule.repository';
import { PlatformEventBus } from '@saas/core-platform';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TIMETABLE_UNASSIGNED_TEACHER } from '../timetables.constants';

describe('TimetableService', () => {
  let service: TimetableService;
  let ttRepo: jest.Mocked<TimetableRepository>;
  let bsRepo: jest.Mocked<BellScheduleRepository>;
  let eventBus: jest.Mocked<PlatformEventBus>;

  beforeEach(async () => {
    const mockTtRepo = {
      create: jest.fn(),
      findByArmAndTerm: jest.fn(),
      findByIdWithSlots: jest.fn(),
      findById: jest.fn(),
      getArmDetails: jest.fn(),
      getTerm: jest.fn(),
      getSubjects: jest.fn(),
      replaceSlotsTransactionally: jest.fn(),
    };

    const mockBsRepo = {
      findById: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: TimetableRepository, useValue: mockTtRepo },
        { provide: BellScheduleRepository, useValue: mockBsRepo },
        { provide: PlatformEventBus, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
    ttRepo = module.get(TimetableRepository);
    bsRepo = module.get(BellScheduleRepository);
    eventBus = module.get(PlatformEventBus);
  });

  describe('create', () => {
    it('should throw if Arm not found', async () => {
      ttRepo.getArmDetails.mockResolvedValue(null);
      await expect(service.create('tenant1', { armId: 'a1', termId: 't1', bellScheduleId: 'b1' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw if Timetable exists', async () => {
      ttRepo.getArmDetails.mockResolvedValue({ id: 'a1' } as any);
      ttRepo.getTerm.mockResolvedValue({ id: 't1' } as any);
      bsRepo.findById.mockResolvedValue({ id: 'b1' } as any);
      ttRepo.findByArmAndTerm.mockResolvedValue({ id: 'tt1' } as any);

      await expect(service.create('tenant1', { armId: 'a1', termId: 't1', bellScheduleId: 'b1' }))
        .rejects.toThrow(ConflictException);
    });

    it('should create timetable and emit event', async () => {
      ttRepo.getArmDetails.mockResolvedValue({ id: 'a1' } as any);
      ttRepo.getTerm.mockResolvedValue({ id: 't1' } as any);
      bsRepo.findById.mockResolvedValue({ id: 'b1' } as any);
      ttRepo.findByArmAndTerm.mockResolvedValue(null);
      ttRepo.create.mockResolvedValue({ id: 'tt1' } as any);

      const res = await service.create('tenant1', { armId: 'a1', termId: 't1', bellScheduleId: 'b1' });

      expect(res.id).toBe('tt1');
      expect(eventBus.publish).toHaveBeenCalledWith('Timetable.Created', expect.any(Object));
    });
  });

  describe('bulkUpdateSlots', () => {
    it('should throw if timetable config is missing bellScheduleId', async () => {
      ttRepo.findById.mockResolvedValue({ id: 'tt1', armId: 'a1', config: {} } as any);
      ttRepo.getArmDetails.mockResolvedValue({ id: 'a1', classId: 'c1' } as any);
      
      await expect(service.bulkUpdateSlots('tt1', 'tenant1', { slots: [] }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if overlapping slots detected', async () => {
      ttRepo.findById.mockResolvedValue({ id: 'tt1', armId: 'a1', config: { bellScheduleId: 'b1' } } as any);
      ttRepo.getArmDetails.mockResolvedValue({ id: 'a1', classId: 'c1' } as any);
      bsRepo.findById.mockResolvedValue({ id: 'b1', periods: [{ id: 'p1' }] } as any);
      ttRepo.getSubjects.mockResolvedValue([{ id: 's1' }] as any);

      await expect(service.bulkUpdateSlots('tt1', 'tenant1', {
        slots: [
          { dayOfWeek: 1, periodId: 'p1', subjectId: 's1' },
          { dayOfWeek: 1, periodId: 'p1', subjectId: 's1' }, // Collision
        ]
      })).rejects.toThrow(ConflictException);
    });

    it('should throw if periodId not in bell schedule', async () => {
      ttRepo.findById.mockResolvedValue({ id: 'tt1', armId: 'a1', config: { bellScheduleId: 'b1' } } as any);
      ttRepo.getArmDetails.mockResolvedValue({ id: 'a1', classId: 'c1' } as any);
      bsRepo.findById.mockResolvedValue({ id: 'b1', periods: [{ id: 'valid_p' }] } as any);
      ttRepo.getSubjects.mockResolvedValue([{ id: 's1' }] as any);

      await expect(service.bulkUpdateSlots('tt1', 'tenant1', {
        slots: [{ dayOfWeek: 1, periodId: 'invalid_p', subjectId: 's1' }]
      })).rejects.toThrow(BadRequestException);
    });

    it('should update successfully and assign central Sentinel for teacher', async () => {
      ttRepo.findById.mockResolvedValue({ id: 'tt1', armId: 'a1', config: { bellScheduleId: 'b1' } } as any);
      ttRepo.getArmDetails.mockResolvedValue({ id: 'a1', classId: 'c1' } as any);
      bsRepo.findById.mockResolvedValue({ id: 'b1', periods: [{ id: 'p1' }] } as any);
      ttRepo.getSubjects.mockResolvedValue([{ id: 's1' }] as any);
      ttRepo.replaceSlotsTransactionally.mockResolvedValue([{ id: 'slot1' }] as any);

      const res = await service.bulkUpdateSlots('tt1', 'tenant1', {
        slots: [{ dayOfWeek: 1, periodId: 'p1', subjectId: 's1' }]
      });

      expect(res.length).toBe(1);
      expect(ttRepo.replaceSlotsTransactionally).toHaveBeenCalledWith('tt1', [
        {
          timetableId: 'tt1',
          dayOfWeek: 1,
          periodId: 'p1',
          subjectId: 's1',
          teacherId: TIMETABLE_UNASSIGNED_TEACHER,
          classId: 'c1'
        }
      ]);
      expect(eventBus.publish).toHaveBeenCalledWith('Timetable.Slots.Updated', expect.any(Object));
    });
  });
});
