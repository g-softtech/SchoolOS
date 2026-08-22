import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScannerService } from '../services/scanner.service';
import { ScanRequestDto } from '../dto/scan-request.dto';
import { WorkspaceContext } from '@saas/core-platform';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';

@ApiTags('Scanner')
@Controller('api/v1/attendance/scan')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('arrival')
  @ApiOperation({ summary: 'Process a student arrival scan' })
  @RequirePermission('attendance.scan.submit')
  async processArrival(
    @Body() dto: ScanRequestDto,
    @CurrentWorkspace() workspace: WorkspaceContext,
    @CurrentUser() user: any
  ) {
    return this.scannerService.processArrival(
      (workspace.tenantId || (workspace as any).tenant?.id), 
      dto.admissionNumber,
      user.id,
      dto.scanMethod
    );
  }

  @Post('pickup')
  @ApiOperation({ summary: 'Process a student pickup scan' })
  @RequirePermission('attendance.scan.submit')
  async processPickup(
    @Body() dto: ScanRequestDto,
    @CurrentWorkspace() workspace: WorkspaceContext,
    @CurrentUser() user: any
  ) {
    return this.scannerService.processPickup(
      (workspace.tenantId || (workspace as any).tenant?.id), 
      dto.admissionNumber,
      user.id,
      dto.scanMethod
    );
  }
}
