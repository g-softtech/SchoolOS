import { Test, TestingModule } from '@nestjs/testing';
import { LeaveService } from './leave.service';
import { PrismaService, LeaveType, LeaveStatus } from '@saas/core-platform';
import { NotFoundException } from '@nestjs/common';

describe('LeaveService', () => {
  let service: LeaveService;
  let prisma: PrismaService;

  const mockPrisma = {
    staff: {
      findFirst: jest.fn(),
    },
    leaveRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitLeaveRequest', () => {
    it('should throw NotFoundException if staff not found', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null);
      await expect(
        service.submitLeaveRequest('tenant-1', 'staff-1', LeaveType.SICK, new Date(), new Date())
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a leave request successfully', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue({ id: 'staff-1', tenantId: 'tenant-1' });
      mockPrisma.leaveRequest.create.mockResolvedValue({ id: 'leave-1' });

      const result = await service.submitLeaveRequest('tenant-1', 'staff-1', LeaveType.SICK, new Date(), new Date());
      expect(result).toEqual({ id: 'leave-1' });
      expect(mockPrisma.leaveRequest.create).toHaveBeenCalled();
    });
  });

  describe('reviewLeaveRequest', () => {
    it('should throw NotFoundException if leave request not found', async () => {
      mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
      await expect(
        service.reviewLeaveRequest('tenant-1', 'leave-1', LeaveStatus.APPROVED, 'reviewer-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should update the leave request status successfully', async () => {
      mockPrisma.leaveRequest.findFirst.mockResolvedValue({ id: 'leave-1', tenantId: 'tenant-1' });
      mockPrisma.leaveRequest.update.mockResolvedValue({ id: 'leave-1', status: LeaveStatus.APPROVED });

      const result = await service.reviewLeaveRequest('tenant-1', 'leave-1', LeaveStatus.APPROVED, 'reviewer-1');
      expect(result).toEqual({ id: 'leave-1', status: LeaveStatus.APPROVED });
      expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: 'leave-1' },
        data: { status: LeaveStatus.APPROVED },
      });
    });
  });
});
