import { Controller, Post, Body, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { LeaveStatus, WorkspaceContext } from '@saas/core-platform';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { LeaveService } from '../services/leave.service';
import { SubmitLeaveRequestDto, ReviewLeaveRequestDto } from '../dto/leave-request.dto';

@Controller('api/v1/leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @RequirePermission('leave.request')
  async submitLeaveRequest(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: SubmitLeaveRequestDto
  ) {
    const tenantId = ctx.tenantId;
    return this.leaveService.submitLeaveRequest(
      tenantId, 
      dto.staffId, 
      dto.type, 
      new Date(dto.startDate), 
      new Date(dto.endDate), 
      dto.reason
    );
  }

  @Patch(':id/review')
  @RequirePermission('leave.review')
  async reviewLeaveRequest(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveRequestDto
  ) {
    const tenantId = ctx.tenantId;
    const reviewerId = ctx.userId;
    return this.leaveService.reviewLeaveRequest(tenantId, id, dto.status, reviewerId || '');
  }

  @Get()
  @RequirePermission('leave.view')
  async getLeaveRequests(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('status') status?: LeaveStatus
  ) {
    const tenantId = ctx.tenantId;
    return this.leaveService.getLeaveRequests(tenantId, status);
  }
}
