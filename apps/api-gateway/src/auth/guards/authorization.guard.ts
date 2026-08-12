import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkspaceService } from '../../workspace/workspace.service';
import { PolicyService } from '../../policy/policy.service';
import {
  REQUIRE_PERMISSION_KEY,
  REQUIRE_MARKETPLACE_APP_KEY,
  REQUIRE_POLICY_KEY,
} from '../decorators/auth.decorators';
import { REQUIRE_FEATURE_KEY } from '../../platform-services/feature-flags/decorators/require-feature.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspaceService: WorkspaceService,
    private readonly policyService: PolicyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const start = performance.now();
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;
    const tenantId = req.headers['x-tenant-id'] || req.body?.tenantId || req.query?.tenantId;

    if (!userId) {
      throw new ForbiddenException({ allowed: false, reason: 'User not authenticated' });
    }

    // 0. Resolve Workspace Context (Gets cached permission graph)
    const workspace = await this.workspaceService.resolveWorkspace(userId, tenantId);
    
    const trace = {
      permission: true,
      marketplace: true,
      feature: true,
      entitlement: true,
      policy: true,
    };

    try {
      // 1. Permission Check (O(1) lookup on Permission Graph)
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some(p => workspace.user.permissions[p]);
        if (!hasPermission) {
          trace.permission = false;
          throw new ForbiddenException({ allowed: false, reason: `Missing required permission(s)` });
        }
      }

      // 2. Marketplace App Check
      const requiredApp = this.reflector.getAllAndOverride<string>(REQUIRE_MARKETPLACE_APP_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredApp && !workspace.marketplaceApps.includes(requiredApp)) {
        trace.marketplace = false;
        throw new ForbiddenException({ allowed: false, reason: `Marketplace app '${requiredApp}' not installed` });
      }

      // 3. Feature Flag Check
      const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredFeature && !workspace.featureFlags[requiredFeature]) {
        trace.feature = false;
        throw new ForbiddenException({ allowed: false, reason: `Feature '${requiredFeature}' is disabled` });
      }

      // 4. Entitlement Check
      // This is simplified; in reality, we'd check if the subscription supports the action.
      if (workspace.subscription && workspace.subscription.status !== 'ACTIVE') {
        trace.entitlement = false;
        throw new ForbiddenException({ allowed: false, reason: 'Subscription is inactive or expired' });
      }

      // 5. School Policy Engine
      const requiredPolicy = this.reflector.getAllAndOverride<string>(REQUIRE_POLICY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredPolicy) {
        try {
          await this.policyService.evaluate(requiredPolicy, {
            tenantId: workspace.tenant.id,
            userId,
            resource: req.body,
          });
        } catch (policyError: any) {
          trace.policy = false;
          throw new ForbiddenException({ allowed: false, reason: policyError.message || `Blocked by policy '${requiredPolicy}'` });
        }
      }

      // If we reach here, it's allowed
      this.recordMetrics(performance.now() - start, 'Granted');
      return true;

    } catch (error) {
      this.recordMetrics(performance.now() - start, 'Denied');
      
      // Increment Security Score for repeated denials (Analytics)
      this.eventEmitter.emit('Analytics.Track', {
        event: 'AuthorizationDenied',
        userId,
        tenantId: workspace.tenant.id,
        properties: { trace, reason: error.response?.reason }
      });

      // Audit Log for denied actions
      this.eventEmitter.emit('AuditLog.Create', {
        tenantId: workspace.tenant.id,
        userId,
        action: 'AUTHORIZATION_DENIED',
        resource: req.url,
        details: { trace, reason: error.response?.reason },
      });

      // Still return a structured result (ForbiddenException handles this if we pass object)
      throw error;
    }
  }

  private recordMetrics(durationMs: number, result: string) {
    this.eventEmitter.emit('Analytics.Track', {
      event: 'AuthorizationMetrics',
      properties: { durationMs, result }
    });
  }
}
