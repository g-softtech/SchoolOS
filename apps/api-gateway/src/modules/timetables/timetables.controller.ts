import { Controller, Post, Body, Request } from '@nestjs/common';
import { TimetablesService } from './timetables.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('timetables')
export class TimetablesController {
  constructor(private readonly timetablesService: TimetablesService) {}

  @Post('bell-schedules')
  async createBellSchedule(@Request() req: any, @Body() body: any) {
    return this.timetablesService.createBellSchedule(
      req.user.tenantId,
      body.name,
      body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      body.effectiveTo ? new Date(body.effectiveTo) : undefined,
    );
  }

  @Post('slots')
  @ApiOperation({ summary: 'Assign a slot' })
  async assignSlot(@Request() req: any, @Body() body: any) {
    return this.timetablesService.assignSlot(
      req.user.tenantId,
      body.academicTermId,
      body.bellScheduleId,
      body.teachingDayId,
      body.periodId,
      body.subjectAssignmentId,
      body.roomId,
      body.teacherId,
    );
  }
}
