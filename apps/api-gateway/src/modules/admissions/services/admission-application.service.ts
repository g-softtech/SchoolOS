import { Injectable, BadRequestException } from '@nestjs/common';
import { AdmissionApplicationRepository } from '../repositories';
import { PlatformStorageService, OutboxService } from '@saas/core-platform';
import { WorkspaceContext } from '@saas/core-platform';

@Injectable()
export class AdmissionApplicationService {
  constructor(
    private readonly applicationRepo: AdmissionApplicationRepository,
    private readonly outboxService: OutboxService,
    private readonly storageService: PlatformStorageService // Storage abstraction only
  ) {}

  async submitApplication(ctx: WorkspaceContext, payload: any) {
    return this.applicationRepo.transaction(async (repo) => {
      const application = await repo.create({
        data: {
          tenantId: ctx.tenantId,
          campaignId: payload.campaignId,
          applicantId: ctx.userId || '',
          studentFirstName: payload.studentFirstName,
          studentLastName: payload.studentLastName,
          studentDateOfBirth: new Date(payload.studentDateOfBirth),
          customFields: payload.customFields,
          formVersion: payload.formVersion,
        }
      });

      // Event Architecture
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Admissions.Application.Submitted',
        aggregateId: application.id,
        aggregateType: 'AdmissionApplication',
        tenantId: ctx.tenantId,
        payload: { applicationId: application.id, campaignId: application.campaignId },
        version: 1
      });

      // Audit Log
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'AuditLog',
        aggregateId: application.id,
        aggregateType: 'SYSTEM',
        tenantId: ctx.tenantId,
        payload: {
          action: 'APPLICATION_SUBMITTED',
          entity: 'AdmissionApplication',
          entityId: application.id,
          userId: ctx.userId,
        },
        version: 1
      });

      return application;
    });
  }

  /**
   * The Enrollment Boundary:
   * Admissions never touches the Student module database directly.
   * We only publish the ApplicationEnrolled event.
   */
  async triggerEnrollment(ctx: WorkspaceContext, applicationId: string) {
    const application = await this.applicationRepo.findById(ctx.tenantId, applicationId);
    if (!application) throw new BadRequestException('Application not found');

    return this.applicationRepo.transaction(async (repo) => {
      // Trigger Enrollment Event
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Admissions.Application.Enrolled',
        aggregateId: application.id,
        aggregateType: 'AdmissionApplication',
        tenantId: ctx.tenantId,
        payload: {
          applicationId: application.id,
          studentFirstName: application.studentFirstName,
          studentLastName: application.studentLastName,
          studentDateOfBirth: application.studentDateOfBirth
        },
        version: 1
      });

      // Audit Log
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'AuditLog',
        aggregateId: application.id,
        aggregateType: 'SYSTEM',
        tenantId: ctx.tenantId,
        payload: {
          action: 'ENROLLMENT_TRIGGERED',
          entity: 'AdmissionApplication',
          entityId: application.id,
          userId: ctx.userId,
        },
        version: 1
      });

      return { success: true, message: 'Enrollment triggered via EventBus' };
    });
  }
}
