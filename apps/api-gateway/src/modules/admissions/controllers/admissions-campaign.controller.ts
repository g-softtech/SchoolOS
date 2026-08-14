import { Controller, Post, Body, HttpCode, HttpStatus, Param, Put, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionCampaignService } from '../services/admission-campaign.service';
import { CreateCampaignDto } from '../dto/create/create-campaign.dto';
import { ApiResponseDto } from '../dto/response/api-response.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';

import { AdmissionCampaignRepository } from '../repositories/admission-campaign.repository';
import { AdmissionFormRepository } from '../repositories/admission-form.repository';

@ApiTags('Admissions - Campaigns')
@ApiBearerAuth()
@Controller({ path: 'admissions/campaigns', version: '1' })
export class AdmissionsCampaignController {
  constructor(
    private readonly campaignService: AdmissionCampaignService,
    private readonly campaignRepo: AdmissionCampaignRepository,
    private readonly formRepo: AdmissionFormRepository
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Admission Campaign', description: 'Requires MANAGE_ADMISSION_CAMPAIGNS permission.' })
  @ApiCreatedResponse({ type: ApiResponseDto })
  @RequirePermission('MANAGE_ADMISSION_CAMPAIGNS')
  async createCampaign(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateCampaignDto
  ) {
    const campaign = await this.campaignService.createCampaign(ctx, {
      name: dto.name,
      academicYearId: dto.academicYearId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      maxApplicants: dto.maxApplicants,
      applicationFee: dto.applicationFee,
    });
    
    return new ApiResponseDto(true, campaign, { message: 'Campaign created successfully' });
  }

  @Put(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an Admission Campaign', description: 'Moves a draft campaign to ACTIVE state.' })
  @ApiOkResponse({ type: ApiResponseDto })
  @RequirePermission('MANAGE_ADMISSION_CAMPAIGNS')
  async activateCampaign(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string
  ) {
    const activated = await this.campaignService.activateCampaign(ctx, id);
    return new ApiResponseDto(true, activated, { message: 'Campaign activated' });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List Admission Campaigns' })
  @ApiOkResponse({ type: ApiResponseDto })
  @RequirePermission('admissions.campaign.read')
  async listCampaigns(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('status') status?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const result = await this.campaignRepo.searchCampaigns(ctx.tenantId, {
      status,
      academicYearId,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 20,
    });
    return new ApiResponseDto(true, result, { message: 'Campaigns retrieved' });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an Admission Campaign' })
  @ApiOkResponse({ type: ApiResponseDto })
  @RequirePermission('admissions.campaign.read')
  async getCampaign(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string
  ) {
    const campaign = await this.campaignRepo.findById(ctx.tenantId, id);
    if (!campaign) {
      return new ApiResponseDto(false, null, { message: 'Campaign not found' });
    }
    return new ApiResponseDto(true, campaign, { message: 'Campaign retrieved' });
  }

  @Get(':id/form')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Published Admission Form for Campaign' })
  @ApiOkResponse({ type: ApiResponseDto })
  @RequirePermission('admissions.campaign.read')
  async getCampaignForm(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string
  ) {
    const form = await this.formRepo.findPublishedForm(ctx.tenantId, id);
    if (!form) {
      return new ApiResponseDto(false, null, { message: 'Form not found or not published' });
    }
    return new ApiResponseDto(true, form, { message: 'Form retrieved' });
  }
}
