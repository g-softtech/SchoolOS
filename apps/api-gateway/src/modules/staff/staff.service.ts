import { Injectable, BadRequestException } from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateDepartmentDto, HireStaffDto, UpdateEmploymentDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- Departments ---
  async createDepartment(tenantId: string, dto: CreateDepartmentDto) {
    return this.staffRepo.createDepartment(tenantId, dto);
  }

  async listDepartments(tenantId: string) {
    return this.staffRepo.listDepartments(tenantId);
  }

  // --- Staff & Employment ---
  async hireStaff(tenantId: string, dto: HireStaffDto) {
    // We could add membership validation here if needed, but Prisma will throw if membershipId doesn't exist
    const staff = await this.staffRepo.hireStaff(tenantId, dto);
    
    this.eventEmitter.emit('Staff.Hired', {
      tenantId,
      staffId: staff.id,
      membershipId: staff.membershipId,
    });
    
    return staff;
  }

  async getStaffList(tenantId: string) {
    return this.staffRepo.getStaffList(tenantId);
  }

  async getStaffById(tenantId: string, staffId: string) {
    return this.staffRepo.getStaffById(tenantId, staffId);
  }

  async getEligibleMemberships(tenantId: string) {
    return this.staffRepo.getEligibleMemberships(tenantId);
  }

  async updateEmploymentStatus(tenantId: string, staffId: string, dto: UpdateEmploymentDto) {
    if (dto.status === 'TERMINATED' && !dto.terminationDate) {
      throw new BadRequestException('terminationDate is required when status is TERMINATED');
    }

    const updated = await this.staffRepo.updateEmploymentStatus(tenantId, staffId, dto);
    
    const eventMap: Record<string, string> = {
      ACTIVE: 'Staff.Employment.Activated',
      SUSPENDED: 'Staff.Employment.Suspended',
      TERMINATED: 'Staff.Employment.Terminated',
      ON_LEAVE: 'Staff.Employment.OnLeave'
    };

    const event = eventMap[dto.status];
    if (event) {
      this.eventEmitter.emit(event, { tenantId, staffId, status: dto.status });
    }

    return updated;
  }
}
