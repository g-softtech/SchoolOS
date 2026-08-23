import { Controller, Get, Post, Put, Body, Param, Req, Query } from '@nestjs/common';
import { AllocationService } from '@saas/core-platform';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import type { Request } from 'express';

@Controller('v1/transport/allocations')
export class AllocationsController {
  constructor(private readonly allocationService: AllocationService) {}

  @Post()
  @RequirePermission('transport.manage_allocations')
  async createAllocation(@Req() req: Request, @Body() body: any) {
    return this.allocationService.createAllocation({
      tenantId: (req.user as any).tenantId,
      ...body,
    });
  }

  @Put(':id/status')
  @RequirePermission('transport.manage_allocations')
  async setStatus(@Req() req: Request, @Param('id') id: string, @Body('status') status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    return this.allocationService.setAllocationStatus((req.user as any).tenantId, id, status);
  }

  @Get()
  @RequirePermission('transport.view')
  async listAllocations(@Req() req: Request, @Query('vehicleId') vehicleId?: string, @Query('studentId') studentId?: string) {
    return this.allocationService.listAllocations((req.user as any).tenantId, vehicleId, studentId);
  }
}
