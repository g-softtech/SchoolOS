import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetService } from '../services/asset.service';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import { PoliciesGuard } from '../../identity/security/policies.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Website Assets')
@Controller('api/v1/website/assets')
@UseGuards(AuthGuard('jwt'), PoliciesGuard)
@ApiBearerAuth()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload')
  @RequirePermission('asset:create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to the tenant media library' })
  async uploadAsset(
    @Headers('x-tenant-id') tenantId: string,
    @UploadedFile() file: any
  ) {
    return this.assetService.uploadAsset(tenantId, file);
  }
}
