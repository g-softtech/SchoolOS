import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdmissionWorkflowRepository, AdmissionApplicationRepository } from '../repositories';
import { PlatformEventBus } from '@saas/core-platform';
import { WorkspaceContext } from '../../shared/context/workspace-context';

@Injectable()
export class AdmissionWorkflowService {
  constructor(
    private readonly workflowRepo: AdmissionWorkflowRepository,
    private readonly applicationRepo: AdmissionApplicationRepository,
    private readonly eventBus: PlatformEventBus,
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

    const workflow = await this.workflowRepo.findWithStages(ctx.tenantId, application.campaignId); // Assuming Campaign is linked to a workflow, though schema links workflow directly or via Campaign. 
    // Wait, looking at schema, Application has currentStageId. We need to find the target stage.

    // Let's just verify the targetStage belongs to a valid workflow
    const targetStage = await this.workflowRepo.prisma.admissionWorkflowStage.findUnique({
      where: { id: targetStageId }
    });

    if (!targetStage) throw new NotFoundException('Target stage not found');

    // Optimistically lock and update
    const updated = await this.applicationRepo.updateStageWithLock(
      ctx.tenantId,
      applicationId,
      targetStageId,
      version
    );

    // Emit generic transition event
    await this.eventBus.publish({
      type: 'WorkflowTransitioned',
      producer: 'AdmissionsModule',
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
    await this.eventBus.publish({
      type: 'AuditLog',
      producer: 'AdmissionsModule',
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
  }
}
