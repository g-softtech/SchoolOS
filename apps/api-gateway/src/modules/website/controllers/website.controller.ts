import { Controller, Get, Patch, Body, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebsiteService } from '../services/website.service';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import { PoliciesGuard } from '../../identity/security/policies.guard';
import { AuthGuard } from '@nestjs/passport';
import { UpdateWebsiteSettingsDto } from '../dto/website.dto';

@ApiTags('Website Builder')
@Controller('api/v1/website/settings')
@UseGuards(AuthGuard('jwt'), PoliciesGuard)
@ApiBearerAuth()
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get()
  @RequirePermission('website:read')
  @ApiOperation({ summary: 'Get active website configuration' })
  async getSettings(@Headers('x-tenant-id') tenantId: string) {
    return this.websiteService.getSettings(tenantId);
  }

  @Patch()
  @RequirePermission('website:update')
  @ApiOperation({ summary: 'Update branding, theme, and SEO' })
  async updateSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateWebsiteSettingsDto
  ) {
    return this.websiteService.updateSettings(tenantId, dto);
  }
}
