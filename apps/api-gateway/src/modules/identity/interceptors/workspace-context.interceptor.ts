import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContextStorage } from '@saas/core-platform';
import { TenantMembershipRepository } from '../repositories/tenant-membership.repository';

@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  constructor(private readonly membershipRepo: TenantMembershipRepository) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by AuthGuard('jwt') which runs before interceptors
    const tenantId = request.headers['x-tenant-id'];

    if (!user) {
      // If endpoint is public (no AuthGuard), we might just pass through or throw.
      // We assume WorkspaceContextInterceptor is applied only to protected routes.
      throw new UnauthorizedException('Authentication required');
    }

    if (tenantId) {
      // Verify Tenant Membership to prevent cross-tenant pollution
      const membership = await this.membershipRepo.findByUserId(user.sub, tenantId as string);
      
      if (!membership) {
        throw new ForbiddenException('User does not have access to this tenant workspace');
      }
      
      // Store the verified roles/permissions on the request object for RBAC guards to use later
      request.workspace = {
        membershipId: membership.id,
        roleId: membership.roleId,
        tenantId: membership.tenantId
      };
    }

    // Bind the tenant context using the frozen Platform Kernel extension point
    // This allows services and repositories to inject/retrieve tenantId agnostically.
    return new Observable((subscriber) => {
      tenantContextStorage.run({ tenantId: tenantId as string }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
