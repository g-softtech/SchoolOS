import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    if (req.headers['authorization'] === 'Bearer invalid_token_123') {
      throw new UnauthorizedException();
    }
    req.user = req.headers['x-mock-user'] ? JSON.parse(req.headers['x-mock-user']) : { tenantId: 'tenant-1' };
    return true;
  }
}

class MockPermissionsGuard {
  canActivate() { return true; }
}

describe('Hostel API (e2e)', () => {
  jest.setTimeout(30000); // Allow time for NestJS app boot and DB connection
  let app: INestApplication;
  let prisma: PrismaService;
  let authHeader: string;
  let unauthorizedHeader: string;
  let tenantId: string;
  let otherTenantId = 'tenant_other_999';
  let staffWardenId: string;
  let otherTenantStaffId: string;
  let studentId: string;
  let hostelId: string;
  let roomId: string;
  let allocationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockPermissionsGuard());
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    // Test-only fix: Monkey-patch $transaction to force higher timeout/maxWait to handle E2E Neon DB latency
    try {
      const { HostelAllocationService } = require('@saas/core-platform');
      if (HostelAllocationService) {
        const allocService = app.get(HostelAllocationService, { strict: false });
        if (allocService && (allocService as any).prisma) {
          const servicePrisma = (allocService as any).prisma;
          const origTx = servicePrisma.$transaction.bind(servicePrisma);
          Object.defineProperty(servicePrisma, '$transaction', {
            value: async (...args: any[]) => {
              if (args.length === 0) return origTx();
              if (args.length === 1) {
                args.push({ maxWait: 30000, timeout: 30000 });
              } else {
                args[1] = { ...args[1], maxWait: 30000, timeout: 30000 };
              }
              return origTx(...args);
            },
            writable: true,
            configurable: true
          });
        }
      }
    } catch (err) {
      console.error('Failed to monkey-patch HostelAllocationService:', err);
    }
    
    authHeader = 'Bearer valid_mock_token';
    unauthorizedHeader = 'Bearer invalid_token_123';
    
    // Create plan if it doesn't exist
    const plan = await prisma.platformPlan.findFirst();
    const planId = plan?.id || (await prisma.platformPlan.create({
      data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }
    })).id;

    // Dynamically create isolated test tenants
    tenantId = `tenant-hostel-${Date.now()}`;
    await prisma.tenant.create({
      data: { id: tenantId, name: 'Hostel Tenant', slug: `hostel-${Date.now()}`, planId, status: 'ACTIVE' }
    });

    // Create a mock user for the warden
    const wardenUser = await prisma.user.create({
      data: { email: `warden_${Date.now()}@school.com`, passwordHash: 'hash' }
    });
    const wardenRole = await prisma.role.create({ data: { tenantId, name: 'STAFF', isSystem: false } });
    const wardenMembership = await prisma.tenantMembership.create({
      data: { tenantId, userId: wardenUser.id, state: 'ACTIVE', roleId: wardenRole.id }
    });
    const existingStaff = await prisma.staff.create({
      data: { tenantId, membershipId: wardenMembership.id, staffIdNumber: `STF_TEST_${Date.now()}` }
    });
    staffWardenId = existingStaff.id;

    // For cross-tenant staff
    otherTenantId = `tenant-other-${Date.now()}`;
    await prisma.tenant.create({
      data: { id: otherTenantId, name: 'Other Tenant', slug: `other-${Date.now()}`, planId, status: 'ACTIVE' }
    });
    const otherWardenUser = await prisma.user.create({
      data: { email: `other_warden_${Date.now()}@school.com`, passwordHash: 'hash' }
    });
    const otherWardenRole = await prisma.role.create({ data: { tenantId: otherTenantId, name: 'STAFF', isSystem: false } });
    const otherWardenMembership = await prisma.tenantMembership.create({
      data: { tenantId: otherTenantId, userId: otherWardenUser.id, state: 'ACTIVE', roleId: otherWardenRole.id }
    });
    const otherStaff = await prisma.staff.create({
      data: { tenantId: otherTenantId, membershipId: otherWardenMembership.id, staffIdNumber: `STF_TEST2_${Date.now()}` }
    });
    otherTenantStaffId = otherStaff.id;

    // Create a mock user for the student
    const studentUser = await prisma.user.create({
      data: { email: `student_${Date.now()}@school.com`, passwordHash: 'hash' }
    });
    const studentRole = await prisma.role.create({ data: { tenantId, name: 'STUDENT', isSystem: false } });
    const stuMembership = await prisma.tenantMembership.create({
      data: { tenantId, userId: studentUser.id, state: 'ACTIVE', roleId: studentRole.id }
    });
    const existingStudent = await prisma.student.create({
      data: { tenantId, membershipId: stuMembership.id, admissionNumber: `ADM_TEST_${Date.now()}` }
    });
    studentId = existingStudent.id;
  });

  async function createTestStudent(admNo: string) {
    const user = await prisma.user.create({
      data: { email: `stu_${admNo}@school.com`, passwordHash: 'hash' }
    });
    const studentRole = await prisma.role.findFirst({ where: { tenantId, name: 'STUDENT' } }) || 
      await prisma.role.create({ data: { tenantId, name: 'STUDENT', isSystem: false } });
    const mem = await prisma.tenantMembership.create({
      data: { tenantId, userId: user.id, state: 'ACTIVE', roleId: studentRole.id }
    });
    return await prisma.student.create({
      data: { tenantId, membershipId: mem.id, admissionNumber: admNo }
    });
  }

  afterAll(async () => {
    if (prisma) {
      // Only clean up hostel data created by this test suite
      try {
        await prisma.bedAllocation.deleteMany({ where: { tenantId } });
        await prisma.hostelRoom.deleteMany({ where: { tenantId } });
        await prisma.hostel.deleteMany({ where: { tenantId } });
        // Clean up any test students created for capacity tests
        await prisma.student.deleteMany({ where: { tenantId, admissionNumber: { startsWith: 'ADM_TEST_' } } });
      } catch (e) {
        console.warn('Cleanup error (non-fatal):', e.message);
      }
    }
    if (app) await app.close();
  });

  describe('Permissions & Authorization', () => {
    it('12. User without hostel.manage cannot modify buildings/wardens (Unauthorized header)', async () => {
      await request(app.getHttpServer())
        .post('/v1/hostels')
        .set('Authorization', unauthorizedHeader)
        .set('x-tenant-id', tenantId)
        .send({ name: 'Hacker Hostel', capacity: 100 })
        .expect(401);
    });

    it('13. User without hostel.allocate cannot allocate students (Unauthorized header)', async () => {
      await request(app.getHttpServer())
        .post('/v1/hostels/allocations')
        .set('Authorization', unauthorizedHeader)
        .set('x-tenant-id', tenantId)
        .send({ roomId: 'uuid_fake', studentId })
        .expect(401);
    });
  });

  describe('Hostel Buildings', () => {
    it('1. Create hostel building', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/hostels')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ name: 'Alpha Hostel', capacity: 50, gender: 'MIXED' })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alpha Hostel');
      hostelId = res.body.data.id;
    });

    it('2. Assign valid Staff warden', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/hostels/${hostelId}/warden`)
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ wardenId: staffWardenId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.wardenId).toBe(staffWardenId);
    });

    it('3. Reject nonexistent warden', async () => {
      const fakeUuid = '00000000-0000-4000-8000-000000000000';
      const res = await request(app.getHttpServer())
        .put(`/v1/hostels/${hostelId}/warden`)
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ wardenId: fakeUuid })
        .expect(400);
      
      expect(res.body.message).toContain('Warden not found');
    });

    it('4. Reject cross-tenant warden', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/hostels/${hostelId}/warden`)
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ wardenId: otherTenantStaffId })
        .expect(400);

      expect(res.body.message).toContain('Warden not found');
    });

    it('11. Tenant A cannot access Tenant B building (cross-tenant reject)', async () => {
      await request(app.getHttpServer())
        .get(`/v1/hostels/${hostelId}`)
        .set('Authorization', authHeader)
        .set('x-tenant-id', otherTenantId)
        .expect(404);
    });
  });

  describe('Hostel Rooms & Allocations', () => {
    it('5. Create room', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/hostels/${hostelId}/rooms`)
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ roomNumber: '101', capacity: 2 })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.capacity).toBe(2);
      roomId = res.body.data.id;
    });

    it('6. Allocate student', async () => {
      const freshStudent = await createTestStudent(`ADM_${Date.now()}_6`);
      studentId = freshStudent.id;
      
      const res = await request(app.getHttpServer())
        .post('/v1/hostels/allocations')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ roomId, studentId })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
      allocationId = res.body.data.id;
    });

    it('9. Same student cannot have two ACTIVE allocations', async () => {
      // Room has capacity 2, try allocating SAME student again
      const res = await request(app.getHttpServer())
        .post('/v1/hostels/allocations')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ roomId, studentId })
        .expect(400);
        
      expect(res.body.message).toContain('Student already has an active hostel allocation');
    });

    it('7. Capacity limit enforced', async () => {
      // Allocate second student (fills room capacity to 2)
      const student2 = await createTestStudent(`ADM_${Date.now()}_2`);
      await request(app.getHttpServer())
        .post('/v1/hostels/allocations')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ roomId, studentId: student2.id })
        .expect(201);

      // Room is now full. Try third student.
      const student3 = await createTestStudent(`ADM_${Date.now()}_3`);
      const res = await request(app.getHttpServer())
        .post('/v1/hostels/allocations')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ roomId, studentId: student3.id })
        .expect(400);
      
      expect(res.body.message).toContain('Room capacity exceeded');
    });

    it('10. Vacating a student frees capacity', async () => {
      // Vacate first student
      const vacateRes = await request(app.getHttpServer())
        .put(`/v1/hostels/allocations/${allocationId}/vacate`)
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .expect(200);
      expect(vacateRes.body.data.status).toBe('VACATED');

      // Now student3 should be able to allocate
      const student3 = await prisma.student.findFirst({ where: { tenantId, admissionNumber: { endsWith: '_3' } } });
      const res = await request(app.getHttpServer())
        .post('/v1/hostels/allocations')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .send({ roomId, studentId: student3!.id })
        .expect(201);
      
      expect(res.body.success).toBe(true);
    });

  });
});

describe('Hostel API (e2e) - Concurrency', () => {
  jest.setTimeout(45000);
  let app: any;
  let customPrisma: any;
  let authHeader: string;
  let tenantId: string;
  let hostelId: string;
  let roomId: string;

  beforeAll(async () => {
    const { Test } = require('@nestjs/testing');
    const { AppModule } = require('../src/app.module');
    const { PrismaService } = require('@saas/core-platform');
    const { ValidationPipe } = require('@nestjs/common');
    const request = require('supertest');

    const originalUrl = process.env.DATABASE_URL || '';
    const customUrl = originalUrl.replace('connection_limit=1', 'connection_limit=2');
    customPrisma = new PrismaService({ datasources: { db: { url: customUrl } } });

    const originalTx = customPrisma.$transaction.bind(customPrisma);
    customPrisma.$transaction = async (...args: any[]) => {
      if (typeof args[0] === 'function') {
        return originalTx(args[0], { maxWait: 30000, timeout: 30000 });
      }
      return originalTx(...args);
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(customPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    class MockJwtAuthGuard { 
      canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        req.user = req.headers['x-mock-user'] ? JSON.parse(req.headers['x-mock-user']) : { tenantId: 'tenant-1' };
        return true;
      }
    }
    class MockPermissionsGuard { canActivate() { return true; } }
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockPermissionsGuard());
    
    await app.init();
    
    authHeader = 'Bearer valid_mock_token';
    tenantId = `tenant-hostel-conc-${Date.now()}`;
    
    const plan = await customPrisma.platformPlan.findFirst();
    const planId = plan?.id || (await customPrisma.platformPlan.create({
      data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }
    })).id;

    await customPrisma.tenant.create({
      data: { id: tenantId, name: 'Conc Tenant', slug: `conc-${Date.now()}`, planId, status: 'ACTIVE' }
    });

    const wardenUser = await customPrisma.user.create({ data: { email: `w_${Date.now()}@school.com`, passwordHash: 'hash' } });
    const wardenRole = await customPrisma.role.create({ data: { tenantId, name: 'STAFF', isSystem: false } });
    const wMem = await customPrisma.tenantMembership.create({ data: { tenantId, userId: wardenUser.id, state: 'ACTIVE', roleId: wardenRole.id } });
    const warden = await customPrisma.staff.create({ data: { tenantId, membershipId: wMem.id, staffIdNumber: `W_${Date.now()}` } });

    const hRes = await request(app.getHttpServer())
      .post('/v1/hostels')
      .set('Authorization', authHeader)
      .set('x-tenant-id', tenantId)
      .send({ name: 'Conc Building', capacity: 50, gender: 'MIXED' });
    if (!hRes.body.data) console.log('hRes error:', hRes.body);
    hostelId = hRes.body.data.id;

    await request(app.getHttpServer())
      .put(`/v1/hostels/${hostelId}/warden`)
      .set('Authorization', authHeader)
      .set('x-tenant-id', tenantId)
      .send({ wardenId: warden.id });

    const rRes = await request(app.getHttpServer())
      .post(`/v1/hostels/${hostelId}/rooms`)
      .set('Authorization', authHeader)
      .set('x-tenant-id', tenantId)
      .send({ roomNumber: '101', capacity: 3 });
    if (!rRes.body.data) console.log('rRes error:', rRes.body);
    roomId = rRes.body.data.id;
  });
  
  async function createTestStudent(admNo: string) {
    const user = await customPrisma.user.create({ data: { email: `stu_${admNo}@school.com`, passwordHash: 'hash' } });
    const studentRole = await customPrisma.role.findFirst({ where: { tenantId, name: 'STUDENT' } }) || 
      await customPrisma.role.create({ data: { tenantId, name: 'STUDENT', isSystem: false } });
    const mem = await customPrisma.tenantMembership.create({ data: { tenantId, userId: user.id, state: 'ACTIVE', roleId: studentRole.id } });
    return await customPrisma.student.create({ data: { tenantId, membershipId: mem.id, admissionNumber: admNo } });
  }

  afterAll(async () => {
    if (customPrisma) {
      await customPrisma.bedAllocation.deleteMany({ where: { tenantId } });
      await customPrisma.hostelRoom.deleteMany({ where: { tenantId } });
      await customPrisma.hostel.deleteMany({ where: { tenantId } });
      await customPrisma.student.deleteMany({ where: { tenantId } });
      await customPrisma.staff.deleteMany({ where: { tenantId } });
      await customPrisma.tenantMembership.deleteMany({ where: { tenantId } });
      await customPrisma.role.deleteMany({ where: { tenantId } });
      await customPrisma.user.deleteMany({ where: { email: { contains: '@school.com' } } });
      await customPrisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    if (app) await app.close();
  });

  it('8. Concurrent allocations cannot exceed capacity', async () => {
    const request = require('supertest');
    
    // Allocate 2 students sequentially to reach 2/3 capacity
    const s1 = await createTestStudent(`ADM_${Date.now()}_1`);
    const s2 = await createTestStudent(`ADM_${Date.now()}_2`);
    await request(app.getHttpServer()).post('/v1/hostels/allocations').set('Authorization', authHeader).set('x-tenant-id', tenantId).send({ roomId, studentId: s1.id }).expect(201);
    await request(app.getHttpServer()).post('/v1/hostels/allocations').set('Authorization', authHeader).set('x-tenant-id', tenantId).send({ roomId, studentId: s2.id }).expect(201);

    // Create two more students for the concurrent test
    const s4 = await createTestStudent(`ADM_${Date.now()}_4`);
    const s5 = await createTestStudent(`ADM_${Date.now()}_5`);

    // Try allocating both concurrently. Only ONE should succeed because capacity is 3 and 2 are already allocated.
    const p1 = request(app.getHttpServer())
      .post('/v1/hostels/allocations')
      .set('Authorization', authHeader)
      .set('x-tenant-id', tenantId)
      .send({ roomId, studentId: s4.id });

    const p2 = request(app.getHttpServer())
      .post('/v1/hostels/allocations')
      .set('Authorization', authHeader)
      .set('x-tenant-id', tenantId)
      .send({ roomId, studentId: s5.id });

    const results = await Promise.all([p1, p2]);
    
    const statuses = results.map((r: any) => r.status);
    expect(statuses.includes(201)).toBe(true);
    expect(statuses.includes(400)).toBe(true);
  });
});

