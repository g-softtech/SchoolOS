import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdmissionApplicationService } from '../services/admission-application.service';
import { WorkspaceContext } from '@saas/core-platform';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';

import { AdmissionApplicationRepository } from '../repositories/admission-application.repository';

@Controller('api/v1/admissions/applications')
export class AdmissionApplicationController {
  constructor(
    private readonly applicationService: AdmissionApplicationService,
    private readonly applicationRepo: AdmissionApplicationRepository
  ) {}

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

  @Get()
  @RequirePermission('admissions.application.read')
  async listApplications(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('campaignId') campaignId?: string,
    @Query('stageId') stageId?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('searchQuery') searchQuery?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const result = await this.applicationRepo.searchApplications(ctx.tenantId, {
      campaignId,
      stageId,
      paymentStatus,
      searchQuery,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 20,
    });
    // Return standard shape like campaign does, or just return result?
    // Campaign controller returns ApiResponseDto, but application controller doesn't use it yet.
    // Let's just return result directly for now.
    return { success: true, data: result };
  }

  @Get(':id')
  @RequirePermission('admissions.application.read')
  async getApplication(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string
  ) {
    const application = await this.applicationRepo.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
      include: { currentStage: true, reviews: true }
    });
    if (!application) {
      return { success: false, data: null, message: 'Application not found' };
    }
    return { success: true, data: application };
  }
}
