import { Controller, Post, Body, Injectable } from '@nestjs/common';
import { WorkspaceService } from '../workspace/workspace.service';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../database/prisma.service';

@Controller('auth')
export class AuthSimulatorController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly policyService: PolicyService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('simulate')
  async simulateAuthorization(
    @Body() dto: { userId: string; tenantId: string; permission?: string; marketplaceApp?: string; feature?: string; policy?: string; resource?: any }
  ) {
    const trace = {
      permission: true,
      marketplace: true,
      feature: true,
      entitlement: true,
      policy: true,
      overridden: false,
    };
    let allowed = true;
    let reason = null;

    try {
      // Check Support Access Grant
      const activeOverride = await this.prisma.supportAccessGrant.findFirst({
        where: {
          userId: dto.userId,
          tenantId: dto.tenantId,
          expiresAt: { gt: new Date() }
        }
      });

      if (activeOverride) {
        trace.overridden = true;
        return { allowed: true, reason: 'Super Admin Override Active', trace };
      }

      // 0. Resolve Context
      const workspace = await this.workspaceService.resolveWorkspace(dto.userId, dto.tenantId);

      // 1. Permission Check
      if (dto.permission && !workspace.user.permissions[dto.permission]) {
        trace.permission = false;
        throw new Error(`Missing required permission: ${dto.permission}`);
      }

      // 2. Marketplace Check
      if (dto.marketplaceApp && !workspace.marketplaceApps.includes(dto.marketplaceApp)) {
        trace.marketplace = false;
        throw new Error(`Marketplace app '${dto.marketplaceApp}' not installed`);
      }

      // 3. Feature Flag Check
      if (dto.feature && !workspace.featureFlags[dto.feature]) {
        trace.feature = false;
        throw new Error(`Feature '${dto.feature}' is disabled`);
      }

      // 4. Entitlement Check
      if (workspace.subscription && workspace.subscription.status !== 'ACTIVE') {
        trace.entitlement = false;
        throw new Error('Subscription is inactive or expired');
      }

      // 5. Policy Check
      if (dto.policy) {
        const policyResult = await this.policyService.evaluate(dto.policy, {
          tenantId: dto.tenantId,
          userId: dto.userId,
          resource: dto.resource,
        });

        if (!policyResult.allowed) {
          trace.policy = false;
          throw new Error(policyResult.reason || `Blocked by policy '${dto.policy}'`);
        }
      }

    } catch (e: any) {
      allowed = false;
      reason = e.message;
    }

    return { allowed, trace, reason };
  }
}
