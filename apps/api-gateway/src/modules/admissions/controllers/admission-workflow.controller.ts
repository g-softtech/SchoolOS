import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdmissionWorkflowService } from '../services/admission-workflow.service';
import { WorkspaceContext } from '@saas/core-platform';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';

@Controller('api/v1/admissions/workflows')
export class AdmissionWorkflowController {
  constructor(private readonly workflowService: AdmissionWorkflowService) {}

  @Post('applications/:id/transition')
  @RequirePermission('admissions.workflow.transition')
  async transitionApplication(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') applicationId: string,
    @Body() body: { targetStageId: string; version: number }
  ) {
    return this.workflowService.transitionApplication(ctx, applicationId, body.targetStageId, body.version);
  }
}
