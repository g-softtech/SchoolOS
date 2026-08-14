import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdmissionWorkflowRepository, AdmissionApplicationRepository } from '../repositories';
import { OutboxService } from '@saas/core-platform';
import { WorkspaceContext } from '@saas/core-platform';

@Injectable()
export class AdmissionWorkflowService {
  constructor(
    private readonly workflowRepo: AdmissionWorkflowRepository,
    private readonly applicationRepo: AdmissionApplicationRepository,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Data-Driven Transition: Transitions an application to the next defined stage
   * in the database without any hardcoded logic like `if (stage === 'Accepted')`.
   */
  async transitionApplication(
    ctx: WorkspaceContext,
    applicationId: string,
    targetStageId: string,
    version: number,
  ) {
    const application = await this.applicationRepo.findById(ctx.tenantId, applicationId);
    if (!application) throw new NotFoundException('Application not found');

    const campaign = await this.workflowRepo.prisma.admissionCampaign.findUnique({
      where: { id: application.campaignId }
    });

    if (!campaign || !campaign.workflowId) {
      throw new BadRequestException('Campaign does not have an associated workflow');
    }

    const workflow = await this.workflowRepo.findWithStages(ctx.tenantId, campaign.workflowId);

    // Verify the targetStage belongs to this workflow
    const targetStage = await this.workflowRepo.prisma.admissionWorkflowStage.findFirst({
      where: { id: targetStageId, workflowId: campaign.workflowId }
    });

    if (!targetStage) throw new NotFoundException('Target stage not found');

    return this.applicationRepo.transaction(async (repo) => {
      // Optimistically lock and update
      const updated = await repo.updateStageWithLock(
        ctx.tenantId,
        applicationId,
        targetStageId,
        version
      );

      // Emit generic transition event
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Admissions.Workflow.Transitioned',
        aggregateId: application.id,
        aggregateType: 'AdmissionApplication',
        tenantId: ctx.tenantId,
        payload: {
          applicationId,
          fromStageId: application.currentStageId,
          toStageId: targetStageId,
          actorId: ctx.userId,
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
          action: 'WORKFLOW_TRANSITION',
          entity: 'AdmissionApplication',
          entityId: applicationId,
          userId: ctx.userId,
          metadata: { from: application.currentStageId, to: targetStageId }
        },
        version: 1
      });

      return updated;
    });
  }
}
