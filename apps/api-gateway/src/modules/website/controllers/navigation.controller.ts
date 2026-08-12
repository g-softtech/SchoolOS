import { Controller, Get, Put, Body, Query, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NavigationService } from '../services/navigation.service';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import { PoliciesGuard } from '../../identity/security/policies.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Website Navigation')
@Controller('api/v1/website/menus')
@UseGuards(AuthGuard('jwt'), PoliciesGuard)
@ApiBearerAuth()
export class NavigationController {
  constructor(private readonly navService: NavigationService) {}

  @Get()
  @RequirePermission('website:read')
  @ApiOperation({ summary: 'Get a specific navigation menu (e.g. HEADER)' })
  async getMenu(
    @Headers('x-tenant-id') tenantId: string,
    @Query('location') location: string,
    @Query('locale') locale?: string
  ) {
    return this.navService.getMenu(tenantId, location, locale);
  }

  @Put(':id/items')
  @RequirePermission('navigation:update')
  @ApiOperation({ summary: 'Update the nested item tree for a menu' })
  async updateMenuItems(
    @Param('id') menuId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { items: any[] }
  ) {
    return this.navService.updateMenu(tenantId, menuId, dto.items);
  }
}
