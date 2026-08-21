import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { CreateDepartmentDto, HireStaffDto, UpdateEmploymentDto } from './dto/staff.dto';

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Departments ---
  async createDepartment(tenantId: string, dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
      },
    });
  }

  async listDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  // --- Staff & Employment ---
  async hireStaff(tenantId: string, dto: HireStaffDto) {
    return this.prisma.$transaction(async (tx) => {
      // Create Staff record
      const staff = await tx.staff.create({
        data: {
          tenantId,
          membershipId: dto.membershipId,
          staffIdNumber: dto.staffIdNumber,
          departmentId: dto.departmentId,
          designation: dto.designation,
        },
      });

      // Create Employment record
      await tx.employment.create({
        data: {
          tenantId,
          staffId: staff.id,
          hireDate: new Date(dto.hireDate),
          contractType: dto.contractType,
          status: 'ACTIVE',
        },
      });

      return staff;
    }, { timeout: 15000 });
  }

  async getStaffList(tenantId: string) {
    return this.prisma.staff.findMany({
      where: { tenantId },
      include: {
        employment: true,
        department: true,
        membership: {
          include: {
            profile: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStaffById(tenantId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId },
      include: {
        employment: true,
        department: true,
        membership: {
          include: {
            profile: true,
            user: { select: { email: true } },
          },
        },
      },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async updateEmploymentStatus(tenantId: string, staffId: string, dto: UpdateEmploymentDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId },
      include: { employment: true },
    });

    if (!staff || !staff.employment) {
      throw new NotFoundException('Staff or employment record not found');
    }

    return this.prisma.employment.update({
      where: { id: staff.employment.id },
      data: {
        status: dto.status,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
      },
    });
  }

  async getEligibleMemberships(tenantId: string) {
    return this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: { name: 'STAFF' },
        staff: null, // Memberships that do not have a Staff record yet
      },
      include: {
        profile: true,
        user: { select: { email: true } },
      },
    });
  }

  async getEligibleTeachers(tenantId: string) {
    return this.prisma.staff.findMany({
      where: {
        tenantId,
        employment: { status: 'ACTIVE' },
        membership: {
          state: 'ACTIVE',
        },
      },
      include: {
        employment: true,
        department: true,
        membership: {
          include: { profile: true },
        },
      },
      orderBy: { staffIdNumber: 'asc' },
    });
  }
}
