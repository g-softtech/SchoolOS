import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceContext } from '@saas/core-platform';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { AttendanceService } from '../services/attendance.service';
import { RecordDailyAttendanceDto } from '../dto/record-attendance.dto';

@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('daily')
  @RequirePermission('attendance.record')
  async recordDailyAttendance(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: RecordDailyAttendanceDto
  ) {
    const tenantId = ctx.tenantId;
    const date = new Date(dto.date);
    return this.attendanceService.recordDailyAttendance(tenantId, dto.armId, date, dto.records);
  }

  @Get('daily')
  @RequirePermission('attendance.view')
  async getDailyAttendance(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('armId') armId: string,
    @Query('date') date: string
  ) {
    const tenantId = ctx.tenantId;
    return this.attendanceService.getAttendanceByArmAndDate(tenantId, armId, new Date(date));
  }
}
