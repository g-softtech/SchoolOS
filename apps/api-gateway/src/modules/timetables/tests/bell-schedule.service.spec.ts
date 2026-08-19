import { Test, TestingModule } from '@nestjs/testing';
import { BellScheduleService } from '../services/bell-schedule.service';
import { BellScheduleRepository } from '../repositories/bell-schedule.repository';
import { PlatformEventBus } from '@saas/core-platform';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BellScheduleService', () => {
  let service: BellScheduleService;
  let repo: jest.Mocked<BellScheduleRepository>;
  let eventBus: jest.Mocked<PlatformEventBus>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BellScheduleService,
        { provide: BellScheduleRepository, useValue: mockRepo },
        { provide: PlatformEventBus, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<BellScheduleService>(BellScheduleService);
    repo = module.get(BellScheduleRepository);
    eventBus = module.get(PlatformEventBus);
  });

  describe('validatePeriods', () => {
    it('should throw if no periods provided', async () => {
      await expect(service.create('tenant1', { name: 'Test', periods: [] }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if time format is invalid', async () => {
      await expect(service.create('tenant1', { 
        name: 'Test', 
        periods: [{ id: '1', name: 'P1', startTime: '8:00', endTime: '09:00' }] // 8:00 invalid (missing leading 0)
      })).rejects.toThrow(/Invalid time format/);
    });

    it('should throw if start time is after end time', async () => {
      await expect(service.create('tenant1', { 
        name: 'Test', 
        periods: [{ id: '1', name: 'P1', startTime: '09:00', endTime: '08:00' }]
      })).rejects.toThrow(/start time must be before end time/);
    });

    it('should throw if periods overlap', async () => {
      await expect(service.create('tenant1', { 
        name: 'Test', 
        periods: [
          { id: '1', name: 'P1', startTime: '08:00', endTime: '09:00' },
          { id: '2', name: 'P2', startTime: '08:30', endTime: '09:30' }
        ]
      })).rejects.toThrow(/overlap/);
    });
  });

  describe('create', () => {
    it('should create a valid bell schedule and publish event', async () => {
      repo.create.mockResolvedValue({ id: 'bs1', tenantId: 'tenant1', name: 'Test', periods: [] } as any);
      
      const res = await service.create('tenant1', {
        name: 'Test',
        periods: [
          { id: '1', name: 'P1', startTime: '08:00', endTime: '08:45' },
          { id: '2', name: 'Break', startTime: '08:45', endTime: '09:00' }
        ]
      });

      expect(res.id).toBe('bs1');
      expect(repo.create).toHaveBeenCalledWith({
        tenantId: 'tenant1',
        name: 'Test',
        periods: expect.any(Array)
      });
      expect(eventBus.publish).toHaveBeenCalledWith('BellSchedule.Created', {
        tenantId: 'tenant1',
        bellScheduleId: 'bs1'
      });
    });
  });
});
