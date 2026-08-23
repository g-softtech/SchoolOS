import { Controller, Get, Post, Body, Param, Req, Query } from '@nestjs/common';
import { MaintenanceService } from '@saas/core-platform';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import type { Request } from 'express';

@Controller('v1/transport/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @RequirePermission('transport.manage_fleet')
  async logMaintenance(@Req() req: Request, @Body() body: any) {
    return this.maintenanceService.logMaintenance({
      tenantId: (req.user as any).tenantId,
      vehicleId: body.vehicleId,
      date: new Date(body.date),
      description: body.description,
      cost: body.cost ? parseFloat(body.cost) : undefined,
    });
  }

  @Get()
  @RequirePermission('transport.view')
  async listMaintenance(@Req() req: Request, @Query('vehicleId') vehicleId?: string) {
    return this.maintenanceService.listMaintenanceLogs((req.user as any).tenantId, vehicleId);
  }
}
