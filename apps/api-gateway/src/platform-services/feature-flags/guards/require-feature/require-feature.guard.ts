import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { FeatureFlagsService } from '../../feature-flags.service';

@Injectable()
export class RequireFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;

    if (!tenantId) {
      // If there's no tenant identified in a multi-tenant SaaS, deny access to tenant features
      throw new ForbiddenException('Tenant identification is required to access this feature.');
    }

    const isEnabled = await this.featureFlagsService.isFeatureEnabled(tenantId, requiredFeature);
    
    if (!isEnabled) {
      throw new ForbiddenException(`Feature '${requiredFeature}' is not enabled for this tenant.`);
    }

    return true;
  }
}
