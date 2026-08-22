import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService, AttendanceStatus } from '@saas/core-platform';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaService;

  const mockPrisma = {
    arm: {
      findFirst: jest.fn(),
    },
    student: {
      findMany: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordDailyAttendance', () => {
    it('should throw NotFoundException if arm not found', async () => {
      mockPrisma.arm.findFirst.mockResolvedValue(null);
      await expect(
        service.recordDailyAttendance('tenant-1', 'arm-1', new Date(), [])
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if a student does not belong to the tenant', async () => {
      mockPrisma.arm.findFirst.mockResolvedValue({ id: 'arm-1', tenantId: 'tenant-1' });
      mockPrisma.student.findMany.mockResolvedValue([{ id: 'student-1' }]); // Only 1 found out of 2

      await expect(
        service.recordDailyAttendance('tenant-1', 'arm-1', new Date(), [
          { studentId: 'student-1', status: AttendanceStatus.PRESENT },
          { studentId: 'student-2', status: AttendanceStatus.ABSENT },
        ])
      ).rejects.toThrow(BadRequestException);
    });

    it('should record attendance successfully', async () => {
      mockPrisma.arm.findFirst.mockResolvedValue({ id: 'arm-1', tenantId: 'tenant-1' });
      mockPrisma.student.findMany.mockResolvedValue([
        { id: 'student-1', tenantId: 'tenant-1' },
      ]);
      mockPrisma.$transaction.mockResolvedValue([{ id: 'attendance-1' }]);

      const result = await service.recordDailyAttendance('tenant-1', 'arm-1', new Date(), [
        { studentId: 'student-1', status: AttendanceStatus.PRESENT },
      ]);

      expect(result).toEqual([{ id: 'attendance-1' }]);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
