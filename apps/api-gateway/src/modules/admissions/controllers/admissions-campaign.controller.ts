import { Controller, Post, Body, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionCampaignService } from '../services/admission-campaign.service';
import { CreateCampaignDto } from '../dto/create/create-campaign.dto';
import { ApiResponseDto } from '../dto/response/api-response.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';

@ApiTags('Admissions - Campaigns')
@ApiBearerAuth()
@Controller({ path: 'admissions/campaigns', version: '1' })
export class AdmissionsCampaignController {
  constructor(private readonly campaignService: AdmissionCampaignService) {}

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
}
