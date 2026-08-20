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
    });
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
}
