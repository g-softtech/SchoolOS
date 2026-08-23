import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { RouteService } from '@saas/core-platform';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import type { Request } from 'express';

@Controller('v1/transport/routes')
export class RoutesController {
  constructor(private readonly routeService: RouteService) {}

  @Post()
  @RequirePermission('transport.manage_routes')
  async createRoute(@Req() req: Request, @Body() body: any) {
    return this.routeService.createRoute({
      tenantId: (req.user as any).tenantId,
      ...body,
    });
  }

  @Get()
  @RequirePermission('transport.view')
  async listRoutes(@Req() req: Request) {
    return this.routeService.listRoutes((req.user as any).tenantId);
  }

  @Get(':id')
  @RequirePermission('transport.view')
  async getRoute(@Req() req: Request, @Param('id') id: string) {
    return this.routeService.getRoute((req.user as any).tenantId, id);
  }
}
