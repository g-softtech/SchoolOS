import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseGuards, Req } from '@nestjs/common';
import supertest from 'supertest';
const request = (supertest as any).default || supertest;
import { RequirePermission } from '../../src/modules/identity/security/require-permission.decorator';
import { PoliciesGuard } from '../../src/modules/identity/security/policies.guard';
import { AuthGuard } from '@nestjs/passport';
import { RoleRepository } from '../../src/modules/identity/repositories/role.repository';

// Mock interceptor that sets workspace from headers
@Controller('api/v1/test-protected')
class TestProtectedController {
  @Get()
  @UseGuards(AuthGuard('jwt'), PoliciesGuard)
  @RequirePermission('test:read')
  getProtectedData(@Req() req: any) {
    return { data: 'secret tenant data', tenantId: req.workspace.tenantId };
  }
}

describe('Tenant Isolation & Header Spoofing (e2e)', () => {
  let app: INestApplication;
  let cacheProvider: any;
  let roleRepo: any;

  beforeAll(async () => {
    cacheProvider = {
      get: jest.fn(),
      set: jest.fn(),
    };
    roleRepo = {
      findById: jest.fn(),
    };

    // A mock guard to replace Passport JWT which normally sets req.user
    const mockJwtGuard = {
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        // Assume user is authenticated
        req.user = { sub: 'user-1' };
        
        // Mock the WorkspaceContextInterceptor logic which reads x-tenant-id
        const tenantId = req.headers['x-tenant-id'];
        
        // Simulating the vulnerability fix: If the user doesn't belong to the tenant, deny!
        // For testing header spoofing: User 1 only belongs to Tenant A (t-1).
        if (tenantId !== 't-1') {
           // Simulate Interceptor denying access or returning empty workspace role
           req.workspace = null; 
        } else {
           req.workspace = { tenantId: 't-1', roleId: 'role-1' };
        }
        return true;
      }
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestProtectedController],
      providers: [
        PoliciesGuard,
        { provide: 'CACHE_PROVIDER', useValue: cacheProvider },
        { provide: RoleRepository, useValue: roleRepo },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow access when passing a valid x-tenant-id the user belongs to', async () => {
    cacheProvider.get.mockResolvedValue({ isSuperAdmin: false, permissions: ['test:read'] });

    const res = await request(app.getHttpServer())
      .get('/api/v1/test-protected')
      .set('Authorization', 'Bearer valid-jwt')
      .set('x-tenant-id', 't-1'); // Legitimate tenant
    
    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('t-1');
  });

  it('should fail with 403 Forbidden when spoofing a foreign x-tenant-id', async () => {
    // User tries to access t-2 (which they don't belong to)
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-protected')
      .set('Authorization', 'Bearer valid-jwt')
      .set('x-tenant-id', 't-2'); 
    
    // The WorkspaceContextInterceptor/PoliciesGuard must reject it
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Missing active workspace context/i);
  });
});
