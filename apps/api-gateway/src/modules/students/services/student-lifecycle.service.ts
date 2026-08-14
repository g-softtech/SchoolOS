import { Injectable, BadRequestException } from '@nestjs/common';
import { PlatformEventBus } from '@saas/core-platform';
import { StudentRepository } from '../repositories/student.repository';
import { IdentityProvisioningService } from '../../identity/services/identity-provisioning.service';
import { IdentityState } from '@saas/core-platform';

@Injectable()
export class StudentLifecycleService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly eventBus: PlatformEventBus,
    private readonly identityProvisioningService: IdentityProvisioningService
  ) {}

  async transitionStatus(
    studentId: string, 
    tenantId: string, 
    newStatus: string, // maps to IdentityState
    actorId: string, 
    reason?: string
  ) {
    const student = await this.studentRepo.findById(studentId, tenantId);
    if (!student) throw new BadRequestException('Student not found');

    const previousStatus = student.membership.state;
    
    // Prevent redundant transitions
    if (previousStatus === newStatus) return student;

    // Update aggregate root (status belongs to TenantMembership in schema)
    await this.identityProvisioningService.transitionMembershipState(
      student.membershipId,
      tenantId,
      newStatus,
      actorId,
      reason
    );

    // Publish Canonical Event for ID Card / Academics
    await this.eventBus.publish('Student.StatusChanged', {
      tenantId,
      studentId,
      previousStatus,
      newStatus,
      reason
    });

    if (newStatus === 'ACTIVE') {
      await this.eventBus.publish('Student.Activated', { tenantId, studentId, studentNumber: student.admissionNumber });
    }

    if (newStatus === 'ARCHIVED') {
      await this.eventBus.publish('Student.Archived', { tenantId, studentId, studentNumber: student.admissionNumber });
    }

    return this.studentRepo.findById(studentId, tenantId);
  }
}

