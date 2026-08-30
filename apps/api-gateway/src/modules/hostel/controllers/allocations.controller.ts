import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HostelAllocationService } from '@saas/core-platform';
import { AllocateStudentDto } from '../dto/hostel.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { AuditAction } from '../../../platform-services/audit/interceptors/audit-log/audit-log.interceptor';

@Controller('v1/hostels/allocations')
export class AllocationsController {
  constructor(private readonly allocationService: HostelAllocationService) {}

  @Get()
  @RequirePermission('hostel.view')
  async getAllocations(@Req() req: any, @Query('roomId') roomId?: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.allocationService.getAllocations(tenantId, roomId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('hostel.allocate')
  @AuditAction('CREATE', 'HostelAllocation')
  async allocateStudent(@Req() req: any, @Body() dto: AllocateStudentDto) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.allocationService.allocateStudent(tenantId, dto);
    return { success: true, data };
  }

  @Put(':id/vacate')
  @RequirePermission('hostel.allocate')
  @AuditAction('VACATE', 'HostelAllocation')
  async vacateStudent(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.allocationService.vacateStudent(tenantId, id);
    return { success: true, data };
  }
}
