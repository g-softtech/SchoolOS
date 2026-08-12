import { Injectable, BadRequestException } from '@nestjs/common';
import { AdmissionApplicationRepository } from '../repositories';
import { PlatformEventBus, PlatformStorageService } from '@saas/core-platform';
import { WorkspaceContext } from '@saas/core-platform';

@Injectable()
export class AdmissionApplicationService {
  constructor(
    private readonly applicationRepo: AdmissionApplicationRepository,
    private readonly eventBus: PlatformEventBus,
    private readonly storageService: PlatformStorageService // Storage abstraction only
  ) {}

  async submitApplication(ctx: WorkspaceContext, payload: any) {
    const application = await this.applicationRepo.create({
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
    await this.eventBus.publish({
      type: 'ApplicationSubmitted',
      producer: 'AdmissionsModule',
      tenantId: ctx.tenantId,
      payload: { applicationId: application.id, campaignId: application.campaignId },
      version: 1
    });

    // Audit Log
    await this.eventBus.publish({
      type: 'AuditLog',
      producer: 'AdmissionsModule',
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
  }

  /**
   * The Enrollment Boundary:
   * Admissions never touches the Student module database directly.
   * We only publish the ApplicationEnrolled event.
   */
  async triggerEnrollment(ctx: WorkspaceContext, applicationId: string) {
    const application = await this.applicationRepo.findById(ctx.tenantId, applicationId);
    if (!application) throw new BadRequestException('Application not found');

    // Trigger Enrollment Event
    await this.eventBus.publish({
      type: 'ApplicationEnrolled',
      producer: 'AdmissionsModule',
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
    await this.eventBus.publish({
      type: 'AuditLog',
      producer: 'AdmissionsModule',
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
  }
}
