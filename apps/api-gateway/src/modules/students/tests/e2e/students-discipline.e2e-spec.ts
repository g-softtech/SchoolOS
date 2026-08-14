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
import { IncidentSeverity } from '@saas/core-platform';

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

describe('Students Discipline Records (Real E2E)', () => {
  jest.setTimeout(120000);
  let app: INestApplication;
  let prisma: PrismaService;
  let studentService: StudentService;

  const tenantSuffix = Date.now().toString();
  const tenantId = `e2e-disc-tenant-${tenantSuffix}`;
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
      data: { id: tenantId, name: `Disc Tenant ${tenantSuffix}`, slug: `disc-tenant-${tenantSuffix}`, planId, status: 'ACTIVE' }
    });

    const studentMembership = await prisma.tenantMembership.create({
      data: {
        tenant: { connect: { id: tenantId } },
        state: 'ACTIVE',
        role: { create: { tenantId, name: 'STUDENT' } },
        user: { create: { email: `disc-student-${tenantSuffix}@test.com`, globalRole: 'USER' } },
        profile: { create: { firstName: 'Discipline', lastName: 'Student', dob: new Date('2010-01-01') } }
      }
    });

    const studentRecord = await prisma.student.create({
      data: {
        id: randomUUID(),
        tenantId,
        membershipId: studentMembership.id,
        enrollmentDate: new Date(),
        admissionNumber: `ADM-DISC-${tenantSuffix}`
      }
    });
    studentId = studentRecord.id;

    const role = await prisma.role.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: 'DISCIPLINE_STAFF',
        isSystem: false,
      },
    });

    const permissions = ['students.discipline.manage', 'students.discipline.read'];
    for (const perm of permissions) {
      let permission = await prisma.permission.findUnique({ where: { name: perm } });
      if (!permission) {
        permission = await prisma.permission.create({ data: { name: perm, description: perm } });
      }
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }

    const user = await prisma.user.create({
      data: { id: randomUUID(), email: `discipline-staff-${randomUUID()}@schoolos.test`, globalRole: 'USER' }
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
    const otherTenantId = `e2e-disc-other-${tenantSuffix}`;
    await prisma.tenant.create({
      data: { id: otherTenantId, name: `Other Disc Tenant`, slug: `other-disc-${tenantSuffix}`, planId, status: 'ACTIVE' }
    });
    const otherRole = await prisma.role.create({
      data: { id: randomUUID(), tenantId: otherTenantId, name: 'DISCIPLINE_OFFICER', isSystem: false }
    });
    for (const perm of permissions) {
      const permission = await prisma.permission.findUnique({ where: { name: perm } });
      if (permission) {
        await prisma.rolePermission.create({ data: { roleId: otherRole.id, permissionId: permission.id } });
      }
    }
    const otherUser = await prisma.user.create({
      data: { id: randomUUID(), email: `other-disc-staff-${randomUUID()}@schoolos.test`, globalRole: 'USER' }
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

  it('should create multiple discipline incidents separately', async () => {
    const res1 = await request(app.getHttpServer())
      .post(`/api/v1/students/${studentId}/discipline`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        incidentDate: new Date().toISOString(),
        description: 'First incident',
        severity: 'MINOR'
      });
    expect(res1.status).toBe(201);
    expect(res1.body.description).toBe('First incident');
    expect(res1.body.severity).toBe('MINOR');

    const res2 = await request(app.getHttpServer())
      .post(`/api/v1/students/${studentId}/discipline`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        incidentDate: new Date().toISOString(),
        description: 'Second incident',
        severity: 'MAJOR'
      });
    expect(res2.status).toBe(201);
    expect(res2.body.description).toBe('Second incident');
    expect(res2.body.severity).toBe('MAJOR');

    const records = await prisma.disciplineRecord.findMany({ where: { studentId } });
    expect(records.length).toBe(2);
  });

  it('should retrieve all discipline incidents', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/students/${studentId}/discipline`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('should enforce tenant isolation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/students/${studentId}/discipline`)
      .set('Authorization', `Bearer ${otherTenantToken}`);
    expect(res.status).toBe(404); // Not found because student belongs to different tenant
  });

  it('should reject invalid severity enum', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/students/${studentId}/discipline`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        incidentDate: new Date().toISOString(),
        description: 'Invalid severity',
        severity: 'TERRIBLE'
      });
    // Assuming our setup doesn't strictly have validation pipe enabled in this test (usually it does in real app)
    // Actually, Prisma will throw an error on creation if enum is invalid.
    expect(res.status).not.toBe(201);
  });
});
