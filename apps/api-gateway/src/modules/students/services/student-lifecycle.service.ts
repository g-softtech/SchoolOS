import { Injectable, BadRequestException } from '@nestjs/common';
import { PlatformEventBus } from '@saas/core-platform';
import { StudentStatusLogRepository } from '../repositories/student-status-log.repository';
import { StudentRepository } from '../repositories/student.repository';
import { StudentStatus } from '../dto/student.types';

@Injectable()
export class StudentLifecycleService {
  constructor(
    private readonly statusLogRepo: StudentStatusLogRepository,
    private readonly studentRepo: StudentRepository,
    private readonly eventBus: PlatformEventBus
  ) {}

  async transitionStatus(
    studentId: string, 
    tenantId: string, 
    newStatus: StudentStatus, 
    actorId: string, 
    reason?: string
  ) {
    const student = await this.studentRepo.findById(studentId, tenantId);
    if (!student) throw new BadRequestException('Student not found');

    const previousStatus = student.status;
    
    // Prevent redundant transitions
    if (previousStatus === newStatus) return student;

    // Persist immutable ledger
    await this.statusLogRepo.create({
      studentId,
      previousStatus,
      newStatus,
      reason,
      actorId
    });

    // Update aggregate root (status belongs to TenantMembership in schema)
    // const updated = await this.studentRepo.update(studentId, tenantId, { ... });

    // Publish Canonical Event for ID Card / Academics
    await this.eventBus.publish('Student.StatusChanged', {
      tenantId,
      studentId,
      previousStatus,
      newStatus,
      reason
    });

    if (newStatus === StudentStatus.ACTIVE) {
      await this.eventBus.publish('Student.Activated', { tenantId, studentId, studentNumber: student.admissionNumber });
    }

    if (newStatus === StudentStatus.ARCHIVED) {
      await this.eventBus.publish('Student.Archived', { tenantId, studentId, studentNumber: student.admissionNumber });
    }

    return student;
  }
}
