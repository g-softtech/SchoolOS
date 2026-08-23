import { Controller, Post, Get, Param, Body, Req, Delete } from '@nestjs/common';
import { IdCardService } from '@saas/core-platform';
import { RequirePermission } from '../../identity/security/require-permission.decorator';

@Controller('v1/id-cards')
export class IdCardsController {
  constructor(private readonly idCardService: IdCardService) {}

  @Post('issue')
  @RequirePermission('idcards.manage')
  async issueIdCard(@Req() req: any, @Body() body: any) {
    return this.idCardService.issueIdCard({
      tenantId: req.tenant.id,
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    });
  }

  @Get('active/:ownerType/:ownerId')
  @RequirePermission('idcards.view')
  async getActiveIdCard(
    @Req() req: any,
    @Param('ownerType') ownerType: string,
    @Param('ownerId') ownerId: string
  ) {
    return this.idCardService.getActiveIdCard(req.tenant.id, ownerType, ownerId);
  }

  @Delete('revoke/:idCardId')
  @RequirePermission('idcards.manage')
  async revokeIdCard(@Req() req: any, @Param('idCardId') idCardId: string, @Body() body: any) {
    return this.idCardService.revokeIdCard(req.tenant.id, idCardId, body.reason || 'REVOKED');
  }

  @Get('verify/:token')
  async verifyIdCard(@Req() req: any, @Param('token') token: string) {
    // This is called by the frontend verification page.
    // TenantMiddleware ensures req.tenant.id is present.
    // However, the verification token is globally unique.
    return this.idCardService.verifyIdCard(token);
  }
}
