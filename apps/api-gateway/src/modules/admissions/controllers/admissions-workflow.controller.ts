import { Controller, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionWorkflowService } from '../services/admission-workflow.service';
import { TransitionApplicationDto } from '../dto/workflow/transition-application.dto';
import { ApiResponseDto } from '../dto/response/api-response.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';

@ApiTags('Admissions - Workflow')
@ApiBearerAuth()
@Controller({ path: 'admissions/applications', version: '1' })
export class AdmissionsWorkflowController {
  constructor(private readonly workflowService: AdmissionWorkflowService) {}

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition an application to a new stage', description: 'Requires MANAGE_APPLICATIONS permission. Transitions are deterministic via the Workflow Engine.' })
  @ApiOkResponse({ type: ApiResponseDto })
  @RequirePermission('MANAGE_APPLICATIONS')
  async transitionApplication(@Param('id') applicationId: string, @Body() dto: TransitionApplicationDto) {
    const transitioned = await this.workflowService.transitionApplication(applicationId, dto.nextStageId);
    
    return new ApiResponseDto(true, transitioned, { message: 'Application transitioned to new stage.' });
  }
}
