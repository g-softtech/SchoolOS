import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permission.decorator';
import type { CacheProvider } from '@saas/core-platform';
import { RoleRepository } from '../repositories/role.repository';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('CACHE_PROVIDER') private readonly cache: CacheProvider,
    private readonly roleRepo: RoleRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspace = request.workspace; // Set by WorkspaceContextInterceptor

    if (!workspace || !workspace.roleId || !workspace.tenantId) {
      throw new ForbiddenException('Missing active workspace context or role.');
    }

    const roleId = workspace.roleId;
    const tenantId = workspace.tenantId;

    // 1. Resolve Permissions via Redis (CacheProvider)
    const cacheKey = `rbac:role:${roleId}:tenant:${tenantId}`;
    let permissions = await this.cache.get<string[]>(cacheKey);

    // 2. Cache Miss - Query Database
    if (!permissions) {
      const role = await this.roleRepo.findById(roleId, tenantId);
      
      if (!role) {
        throw new ForbiddenException('Role not found.');
      }
      
      permissions = (role as any).permissions.map((rp: any) => rp.permission.name);
      
      // Store in cache for 15 minutes
      await this.cache.set(cacheKey, permissions, 900);
    }

    // 3. Evaluate Policies
    // Global override for super admin
    const isSuperAdmin = await this.roleRepo.findById(roleId, tenantId).then(r => r?.name === 'SUPER_ADMIN');
    if (isSuperAdmin) {
      return true;
    }

    // Does the user's role contain ALL the required permissions?
    const hasAllPermissions = requiredPermissions.every(perm => permissions!.includes(perm));

    if (!hasAllPermissions) {
      throw new ForbiddenException(`Missing required permissions: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
