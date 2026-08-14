import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env.test', override: true });
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StudentsModule } from '../../students.module';
import { IdentityModule } from '../../../identity/identity.module';
import { DatabaseModule } from '../../../../database/database.module';
import { PrismaService } from '../../../../database/prisma.service';
import { EventDispatcher, PlatformEventBus, PrismaService as CorePrismaService } from '@saas/core-platform';
import { randomUUID } from 'crypto';
const request = require('supertest');
import { StudentService } from '../../services/student.service';

@Global()
@Module({
  providers: [
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
    { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
  ],
  exports: ['CACHE_PROVIDER', 'CACHE_MANAGER'],
})
class GlobalCacheModule {}

// Module level map for auth
const mockTokens = new Map<string, any>();

describe('Students Medical Records (Real E2E)', () => {
  jest.setTimeout(120000);
  let app: INestApplication;
  let prisma: PrismaService;
  let studentService: StudentService;

  const tenantSuffix = Date.now().toString();
  const tenantId = `e2e-med-tenant-${tenantSuffix}`;
  let planId: string;
  let studentId: string;
  let accessToken: string;
  let otherTenantToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        GlobalCacheModule,
        EventEmitterModule.forRoot(),
        IdentityModule,
        StudentsModule,
      ],
      providers: [
        { provide: EventDispatcher, useValue: { dispatch: jest.fn(), registerHandler: jest.fn() } },
        PlatformEventBus
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    studentService = moduleFixture.get(StudentService);

    // Mock Auth Middleware
    app.use((req, res, next) => {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        const token = auth.substring(7);
        if (mockTokens.has(token)) {
          const authData = mockTokens.get(token);
          req.workspace = { tenantId: authData.tenantId, userId: authData.id, roles: [], permissions: [] };
        }
      }
      next();
    });

    await app.init();

    const plan = await prisma.platformPlan.findFirst();
    planId = plan?.id || (await prisma.platformPlan.create({
      data: { name: 'Test Plan', price: 0, entitlements: {} }
    })).id;

    await prisma.tenant.create({
      data: { id: tenantId, name: `Medical Tenant ${tenantSuffix}`, slug: `med-tenant-${tenantSuffix}`, planId, status: 'ACTIVE' }
    });

    const studentMembership = await prisma.tenantMembership.create({
      data: {
        tenant: { connect: { id: tenantId } },
        state: 'ACTIVE',
        role: { create: { tenantId, name: 'STUDENT' } },
        user: { create: { email: `med-student-${tenantSuffix}@test.com`, globalRole: 'USER' } },
        profile: { create: { firstName: 'Medical', lastName: 'Student', dob: new Date('2010-01-01') } }
      }
    });

    const studentRecord = await prisma.student.create({
      data: {
        id: randomUUID(),
        tenantId,
        membershipId: studentMembership.id,
        enrollmentDate: new Date(),
        admissionNumber: `ADM-MED-${tenantSuffix}`
      }
    });
    studentId = studentRecord.id;

    const role = await prisma.role.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: 'MEDICAL_STAFF',
        isSystem: false,
      },
    });

    const permissions = ['students.medical.manage', 'students.medical.read'];
    for (const perm of permissions) {
      let permission = await prisma.permission.findUnique({ where: { name: perm } });
      if (!permission) {
        permission = await prisma.permission.create({ data: { name: perm, description: perm } });
      }
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }

    const user = await prisma.user.create({
      data: { id: randomUUID(), email: `medical-staff-${randomUUID()}@schoolos.test`, globalRole: 'USER' }
    });

    const membership = await prisma.tenantMembership.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId: user.id,
        state: 'ACTIVE',
        roleId: role.id
      }
    });

    mockTokens.clear();
    accessToken = `mock-token-${randomUUID()}`;
    mockTokens.set(accessToken, { id: membership.userId, tenantId });

    // Other tenant setup for isolation check
    const otherTenantId = `e2e-med-other-${tenantSuffix}`;
    await prisma.tenant.create({
      data: { id: otherTenantId, name: `Other Tenant`, slug: `other-med-${tenantSuffix}`, planId, status: 'ACTIVE' }
    });
    const otherRole = await prisma.role.create({
      data: { id: randomUUID(), tenantId: otherTenantId, name: 'MEDICAL_STAFF', isSystem: false }
    });
    for (const perm of permissions) {
      const permission = await prisma.permission.findUnique({ where: { name: perm } });
      if (permission) {
        await prisma.rolePermission.create({ data: { roleId: otherRole.id, permissionId: permission.id } });
      }
    }
    const otherUser = await prisma.user.create({
      data: { id: randomUUID(), email: `other-med-staff-${randomUUID()}@schoolos.test`, globalRole: 'USER' }
    });
    const otherMembership = await prisma.tenantMembership.create({
      data: {
        id: randomUUID(),
        tenantId: otherTenantId,
        userId: otherUser.id,
        state: 'ACTIVE',
        roleId: otherRole.id
      }
    });
    otherTenantToken = `mock-token-${randomUUID()}`;
    mockTokens.set(otherTenantToken, { id: otherMembership.userId, tenantId: otherTenantId });
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (app) await app.close();
  });

  it('should create and update a medical record without duplicating', async () => {
    const res1 = await request(app.getHttpServer())
      .put(`/api/v1/students/${studentId}/medical`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bloodGroup: 'O+',
        allergies: 'Peanuts'
      });
    expect(res1.status).toBe(200);
    expect(res1.body.bloodGroup).toBe('O+');

    const res2 = await request(app.getHttpServer())
      .put(`/api/v1/students/${studentId}/medical`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bloodGroup: 'A-',
        notes: 'Updated note'
      });
    expect(res2.status).toBe(200);
    expect(res2.body.bloodGroup).toBe('A-');
    expect(res2.body.notes).toBe('Updated note');
    expect(res2.body.id).toBe(res1.body.id); // Same record updated

    const records = await prisma.medicalRecord.findMany({ where: { studentId } });
    expect(records.length).toBe(1); // Ensure no duplication
  });

  it('should retrieve the medical record', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/students/${studentId}/medical`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.bloodGroup).toBe('A-');
  });

  it('should enforce tenant isolation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/students/${studentId}/medical`)
      .set('Authorization', `Bearer ${otherTenantToken}`);
    expect(res.status).toBe(404); // Should not find the student in the other tenant
  });
});
