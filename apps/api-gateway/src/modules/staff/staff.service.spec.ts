import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEmployee = {
    id: 'emp-1',
    tenantId: 't1',
    employeeNumber: 'EMP-001',
    firstName: 'John',
    lastName: 'Doe',
    status: 'DRAFT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: PrismaService,
          useValue: {
            department: { create: jest.fn(), findMany: jest.fn() },
            position: { create: jest.fn(), findUnique: jest.fn() },
            employee: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
            employeePositionHistory: { create: jest.fn() },
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(StaffService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  describe('hireEmployee', () => {
    it('creates an employee with DRAFT status and emits Staff.Employee.Created', async () => {
      (prisma.employee.create as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.hireEmployee('t1', {
        employeeNumber: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfHire: new Date(),
      });

      expect(result.status).toBe('DRAFT');
      expect(eventEmitter.emit).toHaveBeenCalledWith('Staff.Employee.Created', {
        tenantId: 't1',
        employeeId: 'emp-1',
        employeeNumber: 'EMP-001',
      });
    });
  });

  describe('transitionStatus', () => {
    it('activates an employee in DRAFT status and emits Staff.Employee.Activated', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockEmployee);
      (prisma.employee.update as jest.Mock).mockResolvedValue({ ...mockEmployee, status: 'ACTIVE' });

      await service.transitionStatus('t1', 'emp-1', 'ACTIVE', 'Onboarding complete');

      expect(eventEmitter.emit).toHaveBeenCalledWith('Staff.Employee.Activated', {
        tenantId: 't1',
        employeeId: 'emp-1',
        reason: 'Onboarding complete',
      });
    });

    it('throws BadRequestException for an illegal status transition', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockEmployee); // DRAFT

      await expect(
        service.transitionStatus('t1', 'emp-1', 'TERMINATED', 'skipping steps'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if employee does not exist', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.transitionStatus('t1', 'nonexistent', 'ACTIVE', 'test'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
