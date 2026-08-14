import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { AdmissionWorkflowService } from '../services/admission-workflow.service';
import { WorkspaceContext } from '@saas/core-platform';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';

import { AdmissionWorkflowRepository } from '../repositories/admission-workflow.repository';

@Controller('api/v1/admissions/workflows')
export class AdmissionWorkflowController {
  constructor(
    private readonly workflowService: AdmissionWorkflowService,
    private readonly workflowRepo: AdmissionWorkflowRepository
  ) {}

  @Post('applications/:id/transition')
  @RequirePermission('admissions.workflow.transition')
  async transitionApplication(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') applicationId: string,
    @Body() body: { targetStageId: string; version: number }
  ) {
    return this.workflowService.transitionApplication(ctx, applicationId, body.targetStageId, body.version);
  }

  @Get(':id')
  @RequirePermission('admissions.workflow.read')
  async getWorkflow(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string
  ) {
    const workflow = await this.workflowRepo.findWithStages(ctx.tenantId, id);
    if (!workflow) {
      return { success: false, data: null, message: 'Workflow not found' };
    }
    return { success: true, data: workflow };
  }

  @Get()
  @RequirePermission('admissions.workflow.read')
  async listWorkflows(
    @CurrentWorkspace() ctx: WorkspaceContext
  ) {
    const workflows = await this.workflowRepo.findMany({ where: { tenantId: ctx.tenantId, deletedAt: null } });
    return { success: true, data: workflows };
  }
}
