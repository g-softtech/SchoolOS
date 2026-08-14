import { Controller, Get, Param, Put, Body } from '@nestjs/common';
import { MedicalRecordService } from '../services/medical-record.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';

@Controller('api/v1/students')
export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordService) {}

  @Get(':studentId/medical')
  @RequirePermission('students.medical.read')
  async getMedicalRecord(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string
  ) {
    return this.medicalRecordService.getMedicalRecord(studentId, ctx.tenantId);
  }

  @Put(':studentId/medical')
  @RequirePermission('students.medical.manage')
  async upsertMedicalRecord(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
    @Body() body: any
  ) {
    return this.medicalRecordService.upsertMedicalRecord(studentId, ctx.tenantId, {
      bloodGroup: body.bloodGroup,
      genotype: body.genotype,
      allergies: body.allergies,
      medicalConditions: body.medicalConditions,
      notes: body.notes
    });
  }
}
