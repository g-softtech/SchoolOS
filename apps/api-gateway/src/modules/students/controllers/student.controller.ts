import { Controller, Get, Param, Patch, Body, Post, Query } from '@nestjs/common';
import { StudentService } from '../services/student.service';
import { StudentLifecycleService } from '../services/student-lifecycle.service';
import { StudentSearchService } from '../services/student-search.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext, IdentityState } from '@saas/core-platform';

@Controller('api/v1/students')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly lifecycleService: StudentLifecycleService,
    private readonly searchService: StudentSearchService
  ) {}

  @Get('search')
  @RequirePermission('students.read')
  async searchStudents(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string
  ) {
    return this.searchService.search(ctx.tenantId, {
      q,
      status,
      limit: limit ? Number(limit) : 50,
      cursor
    });
  }

  @Get(':id')
  @RequirePermission('students.read')
  async getStudent(@CurrentWorkspace() ctx: WorkspaceContext, @Param('id') id: string) {
    return this.studentService.getStudent(id, ctx.tenantId);
  }

  @Post(':id/status')
  @RequirePermission('students.status.update')
  async updateStatus(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
    @Body() body: { targetStatus: IdentityState, reason?: string }
  ) {
    return this.lifecycleService.transitionStatus(id, ctx.tenantId, body.targetStatus, ctx.userId as string, body.reason);
  }
}
