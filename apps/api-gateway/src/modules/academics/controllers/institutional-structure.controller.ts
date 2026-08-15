import { Controller, Get, Param, Body, Post, Patch } from '@nestjs/common';
import { InstitutionalStructureService } from '../services/institutional-structure.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { 
  CreateCampusDto, 
  CreateClassDto, 
  CreateArmDto, 
  CreateSubjectGroupDto, 
  CreateSubjectDto,
  MapClassSubjectsDto
} from '../dto/institutional-structure.dto';

@Controller('api/v1/academics/structure')
export class InstitutionalStructureController {
  constructor(private readonly structureService: InstitutionalStructureService) {}

  // Campuses
  @Post('campuses')
  @RequirePermission('academics.manage')
  async createCampus(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateCampusDto
  ) {
    return this.structureService.createCampus(ctx.tenantId, dto);
  }

  @Get('campuses')
  @RequirePermission('academics.read')
  async getCampuses(@CurrentWorkspace() ctx: WorkspaceContext) {
    return this.structureService.getCampuses(ctx.tenantId);
  }

  // Classes
  @Post('classes')
  @RequirePermission('academics.manage')
  async createClass(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateClassDto
  ) {
    return this.structureService.createClass(ctx.tenantId, dto);
  }

  @Get('classes')
  @RequirePermission('academics.read')
  async getClasses(@CurrentWorkspace() ctx: WorkspaceContext) {
    return this.structureService.getClasses(ctx.tenantId);
  }

  // Arms
  @Post('arms')
  @RequirePermission('academics.manage')
  async createArm(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateArmDto
  ) {
    return this.structureService.createArm(ctx.tenantId, dto);
  }

  // Subjects
  @Post('subject-groups')
  @RequirePermission('academics.manage')
  async createSubjectGroup(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateSubjectGroupDto
  ) {
    return this.structureService.createSubjectGroup(ctx.tenantId, dto);
  }

  @Get('subject-groups')
  @RequirePermission('academics.read')
  async getSubjectGroups(@CurrentWorkspace() ctx: WorkspaceContext) {
    return this.structureService.getSubjectGroups(ctx.tenantId);
  }

  @Post('subjects')
  @RequirePermission('academics.manage')
  async createSubject(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateSubjectDto
  ) {
    return this.structureService.createSubject(ctx.tenantId, dto);
  }

  @Get('subjects')
  @RequirePermission('academics.read')
  async getSubjects(@CurrentWorkspace() ctx: WorkspaceContext) {
    return this.structureService.getSubjects(ctx.tenantId);
  }

  // Class Subject Mapping
  @Patch('classes/:classId/subjects')
  @RequirePermission('academics.manage')
  async mapClassSubjects(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('classId') classId: string,
    @Body() dto: MapClassSubjectsDto
  ) {
    return this.structureService.mapClassSubjects(ctx.tenantId, classId, dto.subjectIds);
  }
}
