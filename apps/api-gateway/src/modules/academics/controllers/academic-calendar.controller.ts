import { Controller, Get, Param, Body, Post, UseGuards } from '@nestjs/common';
import { AcademicCalendarService } from '../services/academic-calendar.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { CreateAcademicYearDto, CreateTermDto } from '../dto/academic-calendar.dto';

@Controller('api/v1/academics/calendar')
export class AcademicCalendarController {
  constructor(private readonly calendarService: AcademicCalendarService) {}

  @Post('years')
  @RequirePermission('academics.manage')
  async createAcademicYear(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateAcademicYearDto
  ) {
    return this.calendarService.createAcademicYear(ctx.tenantId, dto);
  }

  @Get('years')
  @RequirePermission('academics.read')
  async getAcademicYears(@CurrentWorkspace() ctx: WorkspaceContext) {
    return this.calendarService.getAcademicYears(ctx.tenantId);
  }

  @Post('years/:id/activate')
  @RequirePermission('academics.manage')
  async activateAcademicYear(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string
  ) {
    return this.calendarService.activateAcademicYear(ctx.tenantId, id);
  }

  @Post('terms')
  @RequirePermission('academics.manage')
  async createTerm(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateTermDto
  ) {
    return this.calendarService.createTerm(ctx.tenantId, dto);
  }

  @Get('years/:yearId/terms')
  @RequirePermission('academics.read')
  async getTermsByYear(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('yearId') yearId: string
  ) {
    return this.calendarService.getTermsByYear(ctx.tenantId, yearId);
  }
}
