import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { DisciplineRecordService } from '../services/discipline-record.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext, IncidentSeverity } from '@saas/core-platform';

@Controller('api/v1/students')
export class DisciplineRecordController {
  constructor(private readonly disciplineRecordService: DisciplineRecordService) {}

  @Get(':studentId/discipline')
  @RequirePermission('students.discipline.read')
  async getDisciplineRecords(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string
  ) {
    return this.disciplineRecordService.getDisciplineRecords(studentId, ctx.tenantId);
  }

  @Post(':studentId/discipline')
  @RequirePermission('students.discipline.manage')
  async addDisciplineRecord(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
    @Body() body: { incidentDate: string, description: string, actionTaken?: string, severity: IncidentSeverity }
  ) {
    return this.disciplineRecordService.addDisciplineRecord(studentId, ctx.tenantId, {
      incidentDate: new Date(body.incidentDate),
      description: body.description,
      actionTaken: body.actionTaken,
      severity: body.severity
    });
  }
}
