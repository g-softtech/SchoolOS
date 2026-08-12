import { Controller, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionApplicationService } from '../services/admission-application.service';
import { CreateApplicationDto } from '../dto/create/create-application.dto';
import { ApiResponseDto } from '../dto/response/api-response.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';

@ApiTags('Admissions - Applications')
@ApiBearerAuth()
@Controller({ path: 'admissions/applications', version: '1' })
export class AdmissionsApplicationController {
  constructor(private readonly applicationService: AdmissionApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Draft Application', description: 'Requires CREATE_OWN_APPLICATION permission.' })
  @ApiCreatedResponse({ type: ApiResponseDto })
  @RequirePermission('CREATE_OWN_APPLICATION')
  async createDraft(@Body() dto: CreateApplicationDto) {
    const draft = await this.applicationService.createDraft(dto.campaignId, {
      firstName: dto.studentFirstName,
      lastName: dto.studentLastName,
      dob: new Date(dto.studentDateOfBirth),
      customFields: dto.customFields,
    });
    
    return new ApiResponseDto(true, draft, { message: 'Application draft created successfully' });
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a Draft Application', description: 'Requires EDIT_OWN_APPLICATION permission.' })
  @ApiOkResponse({ type: ApiResponseDto })
  @RequirePermission('EDIT_OWN_APPLICATION')
  async submitApplication(@Param('id') id: string) {
    const submitted = await this.applicationService.submitApplication(id);
    return new ApiResponseDto(true, submitted, { message: 'Application submitted successfully' });
  }

  @Post(':id/enroll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enroll an Accepted Application', description: 'Requires ENROLL_STUDENTS permission.' })
  @ApiOkResponse({ type: ApiResponseDto })
  @RequirePermission('ENROLL_STUDENTS')
  async enrollApplication(@Param('id') id: string) {
    const enrolled = await this.applicationService.enrollApplication(id);
    return new ApiResponseDto(true, enrolled, { message: 'Student successfully enrolled' });
  }
}
