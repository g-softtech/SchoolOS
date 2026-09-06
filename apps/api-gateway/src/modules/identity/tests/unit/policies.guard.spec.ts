import { PoliciesGuard } from '../../security/policies.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RoleRepository } from '../../repositories/role.repository';

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: jest.Mocked<Reflector>;
  let cacheProvider: any;
  let roleRepo: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    cacheProvider = {
      get: jest.fn(),
      set: jest.fn(),
    };

    roleRepo = {
      findById: jest.fn(),
    } as any;

    guard = new PoliciesGuard(reflector, cacheProvider, roleRepo);
  });

  const mockContext = (roleId: string, tenantId: string) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        workspace: { roleId, tenantId },
      }),
    }),
  } as unknown as ExecutionContext);

  it('should allow access if no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(mockContext('r1', 't1'))).resolves.toBe(true);
  });

  it('should use cached role data and avoid DB query for SUPER_ADMIN', async () => {
    reflector.getAllAndOverride.mockReturnValue(['users:read']);
    
    // Simulate cache HIT with zero DB lookups
    cacheProvider.get.mockResolvedValue({
      isSuperAdmin: true,
      permissions: [],
    });

    await expect(guard.canActivate(mockContext('r1', 't1'))).resolves.toBe(true);
    expect(roleRepo.findById).not.toHaveBeenCalled(); // Validating N+1 fix
  });

  it('should fetch from DB on cache miss, save to cache, and evaluate correctly', async () => {
    reflector.getAllAndOverride.mockReturnValue(['users:read']);
    cacheProvider.get.mockResolvedValue(null); // Cache MISS

    roleRepo.findById.mockResolvedValue({
      id: 'r1',
      name: 'REGULAR_ROLE',
      permissions: [
        { permission: { name: 'users:read' } },
        { permission: { name: 'users:write' } }
      ]
    } as any);

    await expect(guard.canActivate(mockContext('r1', 't1'))).resolves.toBe(true);

    // Verify cache payload is correctly shaped
    expect(cacheProvider.set).toHaveBeenCalledWith(
      'rbac:role:r1:tenant:t1',
      { isSuperAdmin: false, permissions: ['users:read', 'users:write'] },
      900
    );
  });

  it('should throw ForbiddenException if required permissions are missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['users:delete']);
    cacheProvider.get.mockResolvedValue({
      isSuperAdmin: false,
      permissions: ['users:read'],
    });

    await expect(guard.canActivate(mockContext('r1', 't1'))).rejects.toThrow(ForbiddenException);
  });
});
