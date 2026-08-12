import { Controller, Post, Patch, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/tenant.dto';
import { ApiResponseDto } from '../dto/auth.dto';
import { AuthGuard } from '@nestjs/passport'; 
import { CurrentUser } from '../decorators/current-user.decorator';
import { WorkspaceContextInterceptor } from '../interceptors/workspace-context.interceptor';
import { RequirePermission } from '../security/require-permission.decorator';
import { PoliciesGuard } from '../security/policies.guard';

@ApiTags('Tenant Provisioning')
@Controller('api/v1/tenant-wizard')
export class TenantWizardController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('provision')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provision a new school/tenant in the platform' })
  @ApiResponse({ status: 201, description: 'Tenant successfully provisioned' })
  async provision(
    @Body() dto: CreateTenantDto, 
    @CurrentUser('sub') globalUserId: string
  ): Promise<ApiResponseDto<{ tenantId: string }>> {
    
    const result = await this.tenantService.provisionTenant(globalUserId, dto);
    
    return {
      success: true,
      data: { tenantId: result.tenant.id }
    };
  }

  @Patch('settings')
  @UseGuards(AuthGuard('jwt'), PoliciesGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @RequirePermission('tenant:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant settings (Requires tenant:update permission)' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(): Promise<ApiResponseDto<{ updated: boolean }>> {
    // Controller logic here
    // tenantId is securely available via tenantContextStorage for downstream services
    return {
      success: true,
      data: { updated: true }
    };
  }
}
