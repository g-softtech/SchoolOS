import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { HostelBuildingService } from '@saas/core-platform';
import { CreateHostelDto, UpdateHostelDto, AssignWardenDto } from '../dto/hostel.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { TenantMiddleware } from '../../../middleware/tenant.middleware';
import { AuditAction } from '../../../platform-services/audit/interceptors/audit-log/audit-log.interceptor';

@Controller('v1/hostels')
export class HostelsController {
  constructor(private readonly buildingService: HostelBuildingService) {}

  @Get()
  @RequirePermission('hostel.view')
  async getBuildings(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.buildingService.getBuildings(tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('hostel.manage')
  @AuditAction('CREATE', 'HostelBuilding')
  async createBuilding(@Req() req: any, @Body() dto: CreateHostelDto) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.buildingService.createBuilding(tenantId, dto);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('hostel.view')
  async getBuildingById(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.buildingService.getBuildingById(tenantId, id);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermission('hostel.manage')
  @AuditAction('UPDATE', 'HostelBuilding')
  async updateBuilding(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateHostelDto) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.buildingService.updateBuilding(tenantId, id, dto);
    return { success: true, data };
  }

  @Put(':id/warden')
  @RequirePermission('hostel.manage')
  @AuditAction('UPDATE_WARDEN', 'HostelBuilding')
  async assignWarden(@Req() req: any, @Param('id') id: string, @Body() dto: AssignWardenDto) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.buildingService.assignWarden(tenantId, id, dto.wardenId);
    return { success: true, data };
  }
}
