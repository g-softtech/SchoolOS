import { Test, TestingModule } from '@nestjs/testing';
import { TimetablesService } from './timetables.service';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('TimetablesService', () => {
  let service: TimetablesService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetablesService,
        {
          provide: PrismaService,
          useValue: {
            bellSchedule: {
              create: jest.fn(),
            },
            timetableSlot: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TimetablesService>(TimetablesService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should create a bell schedule', async () => {
    const mockSchedule = { id: 'bell1', tenantId: 't1', name: 'Normal' };
    (prisma.bellSchedule.create as jest.Mock).mockResolvedValue(mockSchedule);

    const result = await service.createBellSchedule('t1', 'Normal');
    expect(result).toEqual(mockSchedule);
    expect(eventEmitter.emit).toHaveBeenCalledWith('Timetable.Config.Created', {
      tenantId: 't1',
      bellScheduleId: 'bell1',
    });
  });

  it('should assign a timetable slot with a teacher', async () => {
    const mockSlot = { id: 'slot1', tenantId: 't1', teacherId: 'teach1' };
    (prisma.timetableSlot.create as jest.Mock).mockResolvedValue(mockSlot);

    const result = await service.assignSlot('t1', 'term1', 'bell1', 'day1', 'period1', 'sub1', undefined, 'teach1');
    expect(result).toEqual(mockSlot);
    expect(eventEmitter.emit).toHaveBeenCalledWith('Timetable.Slot.Created', {
      tenantId: 't1',
      slotId: 'slot1',
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith('Timetable.Teacher.Assigned', {
      tenantId: 't1',
      slotId: 'slot1',
      teacherId: 'teach1',
    });
  });
});
