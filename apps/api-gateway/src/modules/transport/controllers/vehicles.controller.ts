import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { VehicleService } from '@saas/core-platform';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import type { Request } from 'express';

@Controller('v1/transport/vehicles')
export class VehiclesController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @RequirePermission('transport.manage_fleet')
  async createVehicle(@Req() req: Request, @Body() body: any) {
    return this.vehicleService.createVehicle({
      tenantId: (req.user as any).tenantId,
      ...body,
    });
  }

  @Get()
  @RequirePermission('transport.view')
  async listVehicles(@Req() req: Request) {
    return this.vehicleService.listVehicles((req.user as any).tenantId);
  }

  @Get(':id')
  @RequirePermission('transport.view')
  async getVehicle(@Req() req: Request, @Param('id') id: string) {
    return this.vehicleService.getVehicle((req.user as any).tenantId, id);
  }

  @Post(':id/location')
  @RequirePermission('transport.manage_fleet')
  async updateLocation(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.vehicleService.updateLocation(id, {
      tenantId: (req.user as any).tenantId,
      lat: body.lat,
      lng: body.lng,
      timestamp: body.timestamp,
    });
  }
}
