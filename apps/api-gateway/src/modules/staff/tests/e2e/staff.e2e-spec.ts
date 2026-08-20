import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { StaffModule } from '../../staff.module';
import { PrismaService, PrismaModule } from '@saas/core-platform';
import { randomUUID } from 'crypto';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, PermissionsGuard } from '@saas/core-platform';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Mock Guards for E2E
class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    req.user = req.headers['x-mock-user'] ? JSON.parse(req.headers['x-mock-user']) : { tenantId: 'tenant-1' };
    return true;
  }
}

class MockPermissionsGuard {
  canActivate() { return true; }
}

describe('StaffController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  const tenant1 = `tenant-e2e-1-${randomUUID()}`;
  const tenant2 = `tenant-e2e-2-${randomUUID()}`;
  let t1MembershipId: string;
  let t2MembershipId: string;

  beforeAll(async () => {
    jest.setTimeout(60000); // Wait for neon connections
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, StaffModule, EventEmitterModule.forRoot()],
    })
      .overrideGuard(JwtAuthGuard).useClass(MockJwtAuthGuard)
      .overrideGuard(PermissionsGuard).useClass(MockPermissionsGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    
    prisma = app.get(PrismaService);

    // 1. Plan & Tenants
    const plan = await prisma.platformPlan.findFirst();
    const planId = plan?.id || (await prisma.platformPlan.create({
      data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }
    })).id;

    await prisma.tenant.createMany({
      data: [
        { id: tenant1, name: 'T1', slug: `t1-${randomUUID()}`, planId, status: 'ACTIVE' },
        { id: tenant2, name: 'T2', slug: `t2-${randomUUID()}`, planId, status: 'ACTIVE' }
      ]
    });
    
    // Setup Identity Users & Memberships for foreign keys
    const u1 = await prisma.user.create({ data: { email: `u1-${randomUUID()}@test.com`, passwordHash: 'hash' }});
    const u2 = await prisma.user.create({ data: { email: `u2-${randomUUID()}@test.com`, passwordHash: 'hash' }});
    const r1 = await prisma.role.create({ data: { tenantId: tenant1, name: 'STAFF', isSystem: false } });
    const r2 = await prisma.role.create({ data: { tenantId: tenant2, name: 'STAFF', isSystem: false } });
    
    const m1 = await prisma.tenantMembership.create({ data: { tenantId: tenant1, userId: u1.id, state: 'ACTIVE', roleId: r1.id } });
    const m2 = await prisma.tenantMembership.create({ data: { tenantId: tenant2, userId: u2.id, state: 'ACTIVE', roleId: r2.id } });
    
    t1MembershipId = m1.id;
    t2MembershipId = m2.id;
  }, 60000);

  afterAll(async () => {
    // Cleanup
    if (prisma) {
      await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    }
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/staff (POST) - hire staff and ensure tenant isolation', async () => {
    const hireDto = {
      membershipId: t1MembershipId,
      staffIdNumber: 'T1-001',
      hireDate: '2023-01-01T00:00:00Z',
    };

    // Hire on tenant 1
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/staff')
      .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
      .send(hireDto)
      .expect(201);
      
    expect(res1.body.tenantId).toBe(tenant1);
    
    // List staff on tenant 1
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/staff')
      .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
      .expect(200);
      
    expect(listRes.body.length).toBe(1);
    expect(listRes.body[0].staffIdNumber).toBe('T1-001');
    expect(listRes.body[0].employment).toBeDefined();

    // List staff on tenant 2 (should be empty, isolation check)
    const listRes2 = await request(app.getHttpServer())
      .get('/api/v1/staff')
      .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
      .expect(200);
      
    expect(listRes2.body.length).toBe(0);
  });
});
