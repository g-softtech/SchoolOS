import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Global, Module, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule, PrismaService } from '@saas/core-platform';
import { WebsiteModule } from '../../website.module';
import { RoleRepository } from '../../../identity/repositories/role.repository';
const request = require('supertest');
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PoliciesGuard } from '../../../identity/security/policies.guard';

@Global()
@Module({
  providers: [
    { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
    { provide: RoleRepository, useValue: { findRolesWithPermissions: jest.fn().mockResolvedValue([]) } }
  ],
  exports: ['CACHE_MANAGER', 'CACHE_PROVIDER', RoleRepository],
})
class GlobalCacheModule {}

@Injectable()
class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    if (req.headers['authorization'] === 'Bearer invalid_token') {
      throw new UnauthorizedException();
    }
    req.user = req.headers['x-mock-user'] ? JSON.parse(req.headers['x-mock-user']) : { tenantId: 'tenant-1' };
    req.workspaceContext = { tenantId: req.user.tenantId };
    return true;
  }
}

@Injectable()
class MockPoliciesGuard {
  constructor(private reflector: Reflector) {}
  canActivate(context: any) {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler()) || 
                                this.reflector.get<string[]>('require_permission', context.getHandler());
    const req = context.switchToHttp().getRequest();
    if (requiredPermissions && requiredPermissions.length > 0 && req.headers['x-mock-permissions']) {
       const userPerms = JSON.parse(req.headers['x-mock-permissions']);
       const hasPerm = requiredPermissions.some(rp => userPerms.includes(rp));
       if (!hasPerm) return false;
    }
    return true;
  }
}

describe('Website Builder & CMS (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-web-tenant1-${tenantSuffix}`;
  const tenant2 = `e2e-web-tenant2-${tenantSuffix}`;
  let t1Website: any;
  let t1PageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        GlobalCacheModule,
        PrismaModule,
        EventEmitterModule.forRoot(),
        WebsiteModule,
      ],
    })
    .overrideGuard(AuthGuard('jwt')).useClass(MockJwtAuthGuard)
    .overrideGuard(PoliciesGuard).useClass(MockPoliciesGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    prisma = app.get(PrismaService);
    await app.init();

    // Setup Tenants
    const plan = await prisma.platformPlan.findFirst() || await prisma.platformPlan.create({ data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }});
    await prisma.tenant.createMany({
      data: [
        { id: tenant1, name: 'T1', slug: `t1-${tenantSuffix}`, planId: plan.id, status: 'ACTIVE' },
        { id: tenant2, name: 'T2', slug: `t2-${tenantSuffix}`, planId: plan.id, status: 'ACTIVE' }
      ]
    });

    t1Website = await prisma.website.create({
      data: {
        tenantId: tenant1,
        domain: `t1-${tenantSuffix}.schoolos.test`,
        themeColors: { primary: '#000000' },
        seoMeta: { title: 'T1 Website' }
      }
    });

    // Tenant 2 has no website to test 404
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.outboxQueue.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.page.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.website.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      if (app) await app.close();
      if (prisma) await prisma.$disconnect();
    }
  });

  describe('Website Settings & Isolation', () => {
    it('should reject unauthorized access (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/website/settings')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should reject access without required permissions (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/website/settings')
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify([]))
        .expect(403);
    });

    it('should get active website settings for T1', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/website/settings')
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['website:read']))
        .expect(200);
        
      expect(res.body.domain).toBe(`t1-${tenantSuffix}.schoolos.test`);
    });

    it('should return 404 for tenant without website', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/website/settings')
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant2)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
        .set('x-mock-permissions', JSON.stringify(['website:read']))
        .expect(404);
    });

    it('should update branding/theme (requires website:update)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/website/settings')
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['website:update']))
        .send({ themeColors: { primary: '#FF0000' } })
        .expect(200);

      expect(res.body.themeColors.primary).toBe('#FF0000');
    });
  });

  describe('Page Creation & Publishing (CMS)', () => {
    it('should create a new draft page (requires page:create)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/website/pages')
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['page:create']))
        .send({ title: 'About Us', slug: 'about-us' })
        .expect(201);
        
      t1PageId = res.body.id;
      expect(res.body.title).toBe('About Us');
      expect(res.body.isPublished).toBe(false);
    });

    it('should update page content blocks (requires optimistic lock version)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/website/pages/${t1PageId}`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['page:update']))
        .send({ 
          version: 1, 
          contentBlocks: [{ type: 'hero', text: 'Welcome to our school' }] 
        })
        .expect(200);
        
      expect(res.body.version).toBe(2);
      expect(res.body.contentBlocks[0].text).toBe('Welcome to our school');
    });

    it('should fail update on version mismatch (optimistic locking)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/website/pages/${t1PageId}`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['page:update']))
        .send({ 
          version: 1, // Current is now 2
          contentBlocks: [] 
        })
        .expect(409); // Optimistic lock error code usually 409
    });

    it('should publish a draft page to the edge CDN (requires page:publish)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/website/pages/${t1PageId}/publish`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['page:publish']))
        .expect(201);
        
      expect(res.body.isPublished).toBe(true);

      // Verify event log for edge caching
      const event = await prisma.domainEventLog.findFirst({
        where: {
          eventType: 'Website.PagePublished',
          aggregateId: t1PageId,
        }
      });
      expect(event).not.toBeNull();
    });

    it('should archive a published page (requires page:archive)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/website/pages/${t1PageId}/archive`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-tenant-id', tenant1)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['page:archive']))
        .expect(201);
        
      expect(res.body.isPublished).toBe(false);
    });
  });
});
