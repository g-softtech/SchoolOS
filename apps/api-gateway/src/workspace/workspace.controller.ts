import { Controller, Get, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('resolve')
  async resolveWorkspace(@Req() req: any, @Body('tenantId') tenantId?: string) {
    // For now, extract userId from req.user (assuming AuthGuard is applied or decoded from JWT manually)
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException('User ID not found in request context.');

    return this.workspaceService.resolveWorkspace(userId, tenantId);
  }

  @Get('recent')
  async getRecentSchools(@Req() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException('User ID not found in request context.');

    return this.workspaceService.getRecentSchools(userId);
  }

  @Get('status')
  async getStatus() {
    return this.workspaceService.getStatus();
  }
}
