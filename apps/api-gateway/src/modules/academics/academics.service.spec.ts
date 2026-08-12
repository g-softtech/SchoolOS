import { Test, TestingModule } from '@nestjs/testing';
import { AcademicsService } from './academics.service';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('AcademicsService', () => {
  let service: AcademicsService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicsService,
        {
          provide: PrismaService,
          useValue: {
            academicSession: {
              create: jest.fn(),
              findUnique: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
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

    service = module.get<AcademicsService>(AcademicsService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should create an academic session', async () => {
    const mockSession = { id: 'sess1', tenantId: 't1', name: '2026/2027', startDate: new Date(), endDate: new Date() };
    (prisma.academicSession.create as jest.Mock).mockResolvedValue(mockSession);

    const result = await service.createSession('t1', '2026/2027', mockSession.startDate, mockSession.endDate);
    expect(result).toEqual(mockSession);
    expect(eventEmitter.emit).toHaveBeenCalledWith('Academic.Session.Created', {
      tenantId: 't1',
      sessionId: 'sess1',
      name: '2026/2027',
    });
  });

  it('should activate an academic session', async () => {
    const mockSession = { id: 'sess1', tenantId: 't1', isActive: false };
    (prisma.academicSession.findUnique as jest.Mock).mockResolvedValue(mockSession);
    (prisma.academicSession.update as jest.Mock).mockResolvedValue({ ...mockSession, isActive: true });

    const result = await service.activateSession('t1', 'sess1');
    expect(prisma.academicSession.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 't1' },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(true);
    expect(eventEmitter.emit).toHaveBeenCalledWith('Academic.Session.Activated', {
      tenantId: 't1',
      sessionId: 'sess1',
    });
  });
});
