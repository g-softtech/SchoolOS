import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';

const request = require('supertest');
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
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  
  const tenant1 = `tenant-e2e-1-${randomUUID()}`;
  const tenant2 = `tenant-e2e-2-${randomUUID()}`;
  let t1MembershipId: string;
  let t2MembershipId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, StaffModule, EventEmitterModule.forRoot()],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockPermissionsGuard());
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
    try {
      if (prisma) {
        await prisma.employment.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.staff.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.department.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.role.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
        await prisma.user.deleteMany({ where: { email: { contains: 'tenant-e2e' } } });
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      if (prisma) {
        await prisma.$disconnect();
      }
      if (app) {
        await app.close();
      }
    }
  });

  describe('Departments', () => {
    let departmentId: string;

    it('POST /departments - should create department', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/staff/departments')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .send({ name: 'Science', description: 'Science Dept' })
        .expect(201);
      
      expect(res.body.tenantId).toBe(tenant1);
      expect(res.body.name).toBe('Science');
      departmentId = res.body.id;
    });

    it('GET /departments - should isolate and list departments', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/staff/departments')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .expect(200);
      expect(res1.body.length).toBeGreaterThan(0);

      const res2 = await request(app.getHttpServer())
        .get('/api/v1/staff/departments')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
        .expect(200);
      expect(res2.body.length).toBe(0);
    });
  });

  describe('Staff & Employment', () => {
    let staffId: string;

    it('POST /staff - should hire staff and isolate by tenant', async () => {
      const hireDto = {
        membershipId: t1MembershipId,
        staffIdNumber: 'T1-001',
        hireDate: '2023-01-01T00:00:00Z',
      };

      const res1 = await request(app.getHttpServer())
        .post('/api/v1/staff')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .send(hireDto)
        .expect(201);
        
      expect(res1.body.tenantId).toBe(tenant1);
      staffId = res1.body.id;

      // Isolation check
      const listRes2 = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
        .expect(200);
        
      expect(listRes2.body.length).toBe(0);
    });

    it('PATCH /staff/:staffId/employment/status - should update status and reject cross-tenant', async () => {
      // Reject cross-tenant
      await request(app.getHttpServer())
        .patch(`/api/v1/staff/${staffId}/employment/status`)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
        .send({ status: 'SUSPENDED' })
        .expect(404);

      // Successful update
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/staff/${staffId}/employment/status`)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .send({ status: 'ON_LEAVE' })
        .expect(200);
        
      expect(res.body.status).toBe('ON_LEAVE');
    });
  });

  describe('Timetable Eligibility (M12.3)', () => {
    it('GET /assignment/eligible-teachers - should return only ACTIVE staff with ACTIVE membership', async () => {
      // Set staff back to ACTIVE
      const staffList = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .expect(200);

      const activeStaffId = staffList.body[0].id;

      await request(app.getHttpServer())
        .patch(`/api/v1/staff/${activeStaffId}/employment/status`)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .send({ status: 'ACTIVE' })
        .expect(200);

      // Fetch eligible teachers
      const res = await request(app.getHttpServer())
        .get('/api/v1/staff/assignment/eligible-teachers')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(activeStaffId);
      expect(res.body[0].employment.status).toBe('ACTIVE');
      expect(res.body[0].membership.state).toBe('ACTIVE');

      // Tenant isolation
      const resT2 = await request(app.getHttpServer())
        .get('/api/v1/staff/assignment/eligible-teachers')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
        .expect(200);
      expect(resT2.body.length).toBe(0);

      // Now set to TERMINATED, should be excluded
      await request(app.getHttpServer())
        .patch(`/api/v1/staff/${activeStaffId}/employment/status`)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .send({ status: 'TERMINATED', terminationDate: '2023-12-31T00:00:00Z' })
        .expect(200);

      const resAfterTermination = await request(app.getHttpServer())
        .get('/api/v1/staff/assignment/eligible-teachers')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .expect(200);

      expect(resAfterTermination.body.length).toBe(0);

      // Now set back to ACTIVE, but revoke membership
      await request(app.getHttpServer())
        .patch(`/api/v1/staff/${activeStaffId}/employment/status`)
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .send({ status: 'ACTIVE' })
        .expect(200);

      // Directly update the membership via prisma to REVOKED
      const staffMember = await prisma.staff.findUnique({
        where: { id: activeStaffId },
      });
      if (staffMember?.membershipId) {
        await prisma.tenantMembership.update({
          where: { id: staffMember.membershipId },
          data: { isRevoked: true },
        });
      }

      const resAfterRevoked = await request(app.getHttpServer())
        .get('/api/v1/staff/assignment/eligible-teachers')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .expect(200);

      expect(resAfterRevoked.body.length).toBe(0);
    });
  });
});
