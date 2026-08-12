import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdmissionApplicationService } from '../services/admission-application.service';
import { WorkspaceContext } from '@saas/core-platform';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';

@Controller('api/v1/admissions/applications')
export class AdmissionApplicationController {
  constructor(private readonly applicationService: AdmissionApplicationService) {}

  @Post()
  @RequirePermission('admissions.application.create')
  async submitApplication(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() payload: any
  ) {
    return this.applicationService.submitApplication(ctx, payload);
  }

  @Post(':id/enroll')
  @RequirePermission('admissions.application.enroll')
  async triggerEnrollment(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') applicationId: string
  ) {
    return this.applicationService.triggerEnrollment(ctx, applicationId);
  }
}
