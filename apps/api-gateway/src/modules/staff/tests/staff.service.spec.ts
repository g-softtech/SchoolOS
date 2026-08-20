import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from '../staff.service';
import { StaffRepository } from '../staff.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { UpdateEmploymentStatus } from '../dto/staff.dto';

describe('StaffService', () => {
  let service: StaffService;
  let repo: StaffRepository;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: StaffRepository,
          useValue: {
            createDepartment: jest.fn(),
            listDepartments: jest.fn(),
            hireStaff: jest.fn(),
            getStaffList: jest.fn(),
            updateEmploymentStatus: jest.fn(),
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

    service = module.get<StaffService>(StaffService);
    repo = module.get<StaffRepository>(StaffRepository);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hireStaff', () => {
    it('should create staff and emit event', async () => {
      const mockDto = {
        membershipId: 'mem-123',
        staffIdNumber: 'STAFF-001',
        hireDate: '2023-01-01',
      };
      const mockResult = { id: 'staff-1', membershipId: 'mem-123' };
      
      jest.spyOn(repo, 'hireStaff').mockResolvedValue(mockResult as any);

      const result = await service.hireStaff('tenant-1', mockDto);

      expect(repo.hireStaff).toHaveBeenCalledWith('tenant-1', mockDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith('Staff.Hired', {
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        membershipId: 'mem-123',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateEmploymentStatus', () => {
    it('should throw BadRequestException if TERMINATED without date', async () => {
      await expect(
        service.updateEmploymentStatus('tenant-1', 'staff-1', {
          status: UpdateEmploymentStatus.TERMINATED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update and emit event', async () => {
      const mockResult = { id: 'emp-1', status: UpdateEmploymentStatus.SUSPENDED };
      jest.spyOn(repo, 'updateEmploymentStatus').mockResolvedValue(mockResult as any);

      const result = await service.updateEmploymentStatus('tenant-1', 'staff-1', {
        status: UpdateEmploymentStatus.SUSPENDED,
      });

      expect(repo.updateEmploymentStatus).toHaveBeenCalledWith('tenant-1', 'staff-1', {
        status: UpdateEmploymentStatus.SUSPENDED,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('Staff.Employment.Suspended', {
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        status: UpdateEmploymentStatus.SUSPENDED,
      });
      expect(result).toEqual(mockResult);
    });
  });
});
