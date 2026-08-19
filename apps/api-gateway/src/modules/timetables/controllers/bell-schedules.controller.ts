import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BellScheduleService } from '../services/bell-schedule.service';
import { CreateBellScheduleDto, UpdateBellScheduleDto } from '../dto/bell-schedule.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';

@ApiTags('Timetables - Bell Schedules')
@ApiBearerAuth()
@Controller('api/v1/academics/timetables/bell-schedules') 
export class BellSchedulesController {
  constructor(private readonly bellScheduleService: BellScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a bell schedule' })
  @RequirePermission('academics.manage')
  async create(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() createDto: CreateBellScheduleDto,
  ) {
    const data = await this.bellScheduleService.create(ctx.tenantId, createDto);
    return { data };
  }

  @Get()
  @ApiOperation({ summary: 'Get all bell schedules' })
  @RequirePermission('academics.read')
  async findAll(@CurrentWorkspace() ctx: WorkspaceContext) {
    const data = await this.bellScheduleService.findAll(ctx.tenantId);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bell schedule by ID' })
  @RequirePermission('academics.read')
  async findOne(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const data = await this.bellScheduleService.findOne(id, ctx.tenantId);
    return { data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a bell schedule' })
  @RequirePermission('academics.manage')
  async update(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
    @Body() updateDto: UpdateBellScheduleDto,
  ) {
    const data = await this.bellScheduleService.update(id, ctx.tenantId, updateDto);
    return { data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bell schedule' })
  @RequirePermission('academics.manage')
  async remove(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
  ) {
    await this.bellScheduleService.remove(id, ctx.tenantId);
    return { success: true };
  }
}
