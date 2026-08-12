import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * StaffService owns the Employee lifecycle, Department hierarchy, and Position management.
 * It does NOT manage credentials (see CredentialService) or user accounts (Identity module).
 *
 * Employment lifecycle transitions:
 *   DRAFT -> ACTIVE -> ON_LEAVE | SUSPENDED -> TERMINATED -> ARCHIVED
 */

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['ON_LEAVE', 'SUSPENDED', 'TERMINATED'],
  ON_LEAVE: ['ACTIVE', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  TERMINATED: ['ARCHIVED'],
  ARCHIVED: [],
};

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Departments ────────────────────────────────────────────────────

  async createDepartment(tenantId: string, name: string, description?: string, parentId?: string) {
    const department = await this.prisma.department.create({
      data: { tenantId, name, description, parentId },
    });
    return department;
  }

  async listDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Positions ───────────────────────────────────────────────────────

  async createPosition(tenantId: string, departmentId: string, title: string, isTeachingRole: boolean, description?: string) {
    return this.prisma.position.create({
      data: { tenantId, departmentId, title, isTeachingRole, description },
    });
  }

  // ─── Employees ───────────────────────────────────────────────────────

  async hireEmployee(tenantId: string, data: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfHire: Date;
    positionId?: string;
  }) {
    const employee = await this.prisma.employee.create({
      data: {
        tenantId,
        ...data,
        status: 'DRAFT',
      },
    });

    // Record initial position history
    if (data.positionId) {
      const position = await this.prisma.position.findUnique({ where: { id: data.positionId } });
      if (position) {
        await this.prisma.employeePositionHistory.create({
          data: {
            tenantId,
            employeeId: employee.id,
            positionId: data.positionId,
            departmentId: position.departmentId,
            effectiveFrom: data.dateOfHire,
            reason: 'Initial Hire',
          },
        });
      }
    }

    this.eventEmitter.emit('Staff.Employee.Created', {
      tenantId,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
    });

    return employee;
  }

  async transitionStatus(tenantId: string, employeeId: string, newStatus: string, reason: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const allowed = ALLOWED_TRANSITIONS[employee.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${employee.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { status: newStatus },
    });

    const eventMap: Record<string, string> = {
      ACTIVE: 'Staff.Employee.Activated',
      SUSPENDED: 'Staff.Employee.Suspended',
      TERMINATED: 'Staff.Employee.Terminated',
    };

    const event = eventMap[newStatus];
    if (event) {
      this.eventEmitter.emit(event, { tenantId, employeeId, reason });
    }

    return updated;
  }
}
