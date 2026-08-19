import { Controller, Get, Post, Body, Put, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimetableService } from '../services/timetable.service';
import { CreateTimetableDto, BulkUpdateSlotsDto } from '../dto/timetable.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';

@ApiTags('Timetables')
@ApiBearerAuth()
@Controller('api/v1/academics/timetables') 
export class TimetablesController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  @ApiOperation({ summary: 'Initialize a new timetable for an Arm and Term' })
  @RequirePermission('academics.manage')
  async create(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() createDto: CreateTimetableDto,
  ) {
    const data = await this.timetableService.create(ctx.tenantId, createDto);
    return { data };
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup a timetable by armId and termId' })
  @RequirePermission('academics.read')
  async lookup(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('armId') armId: string,
    @Query('termId') termId: string,
  ) {
    const data = await this.timetableService.findByArmAndTermWithSlots(armId, termId, ctx.tenantId);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a timetable with its slots' })
  @RequirePermission('academics.read')
  async findOne(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const data = await this.timetableService.findOneWithSlots(id, ctx.tenantId);
    return { data };
  }

  @Put(':id/slots')
  @ApiOperation({ summary: 'Bulk update all slots for a timetable' })
  @RequirePermission('academics.manage')
  async bulkUpdateSlots(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
    @Body() updateDto: BulkUpdateSlotsDto,
  ) {
    const data = await this.timetableService.bulkUpdateSlots(id, ctx.tenantId, updateDto);
    return { data };
  }
}
