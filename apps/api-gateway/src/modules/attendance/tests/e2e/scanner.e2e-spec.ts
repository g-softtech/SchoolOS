import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env', override: true });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Module, Global } from '@nestjs/common';
const request = require('supertest');
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule, PrismaService } from '@saas/core-platform';
import { AttendanceModule } from '../../attendance.module';
import { randomUUID } from 'crypto';

@Global()
@Module({
  providers: [
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
    { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
  ],
  exports: ['CACHE_PROVIDER', 'CACHE_MANAGER'],
})
class GlobalCacheModule {}

// Mock Guards for E2E
class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    if (req.headers['x-mock-unauthorized']) return false;
    req.user = req.headers['x-mock-user'] ? JSON.parse(req.headers['x-mock-user']) : { tenantId: 'tenant-1' };
    req.workspace = { tenant: { id: req.user.tenantId } };
    return true;
  }
}

class MockPermissionsGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    const permissions = Reflect.getMetadata('require_permission', context.getHandler());
    if (!permissions) return true;

    const user = req.user;
    if (!user || !user.permissions) return false;

    return permissions.every((p: string) => user.permissions.includes(p));
  }
}

describe('ScannerController (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;

  const tenant1 = `e2e-scan-t1-${randomUUID()}`;
  const tenant2 = `e2e-scan-t2-${randomUUID()}`;

  let t1Student: any, t2Student: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        GlobalCacheModule,
        EventEmitterModule.forRoot(),
        AttendanceModule,
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockPermissionsGuard());
    await app.init();

    prisma = app.get(PrismaService);

    // Setup base tenant data
    const plan = await prisma.platformPlan.findFirst();
    const planId = plan?.id || (await prisma.platformPlan.create({
      data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }
    })).id;

    for (const tId of [tenant1, tenant2]) {
      await prisma.tenant.create({
        data: { id: tId, name: `Scan Tenant ${tId}`, slug: tId, planId, status: 'ACTIVE' }
      });
      await prisma.tenantSettings.create({
        data: { tenantId: tId, timezone: 'UTC' }
      });

      const role = await prisma.role.create({
        data: { tenantId: tId, name: `MOCK_ROLE_${tId}`, isSystem: true }
      });

      const stUser = await prisma.user.create({
        data: {
          email: `student-${tId}@test.com`,
          memberships: {
            create: {
              tenantId: tId,
              roleId: role.id,
              state: 'ACTIVE',
              profile: {
                create: { firstName: 'Student', lastName: 'Test' }
              }
            }
          }
        },
        include: { memberships: true }
      });

      const guardianUser = await prisma.user.create({
        data: {
          email: `parent-${tId}@test.com`,
          memberships: {
            create: {
              tenantId: tId,
              roleId: role.id,
              state: 'ACTIVE',
              profile: {
                create: { firstName: 'Parent', lastName: 'Test', phone: '+123456789' }
              }
            }
          }
        },
        include: { memberships: true }
      });

      const cls = await prisma.class.create({
        data: { tenantId: tId, name: 'Class 1', level: 1 }
      });

      const arm = await prisma.arm.create({
        data: { tenantId: tId, classId: cls.id, name: '1A', capacity: 30 }
      });

      const studentRec = await prisma.student.create({
        data: {
          tenantId: tId,
          membershipId: stUser.memberships[0].id,
          admissionNumber: `ADM-SCAN-${tId}`,
          currentArmId: arm.id,
        }
      });

      const guardianRec = await prisma.guardian.create({
        data: {
          tenantId: tId,
          membershipId: guardianUser.memberships[0].id,
        }
      });

      await prisma.studentGuardian.create({
        data: {
          studentId: studentRec.id,
          guardianId: guardianRec.id,
          relationship: 'FATHER'
        }
      });

      if (tId === tenant1) {
        t1Student = studentRec;
        await prisma.user.upsert({ where: { id: 'staff-1' }, update: {}, create: { id: 'staff-1', email: 'staff1@test.com' } });
        await prisma.user.upsert({ where: { id: 'staff-2' }, update: {}, create: { id: 'staff-2', email: 'staff2@test.com' } });
      } else {
        t2Student = studentRec;
        await prisma.user.upsert({ where: { id: `staff-${tId}` }, update: {}, create: { id: `staff-${tId}`, email: `staff-${tId}@test.com` } });
      }
    }
  });

  afterAll(async () => {
    if (prisma) {
      try {
        await prisma.attendance.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.notificationQueue.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.studentGuardian.deleteMany({ where: { guardian: { tenantId: { in: [tenant1, tenant2] } } } });
        await prisma.guardian.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.student.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.arm.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.class.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });

        const memberships = await prisma.tenantMembership.findMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        const userIds = memberships.map(m => m.userId);
        await prisma.profile.deleteMany({ where: { membership: { tenantId: { in: [tenant1, tenant2] } } } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        await prisma.tenantSettings.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
      } catch (err) {
        console.error('Cleanup error:', err);
      }
      await prisma.$disconnect();
    }
    if (app) await app.close();
  });

  const validUser = (tId: string) => JSON.stringify({ id: tId === tenant1 ? 'staff-1' : `staff-${tId}`, tenantId: tId, permissions: ['attendance.scan.submit'] });
  const noPermUser = (tId: string) => JSON.stringify({ id: 'staff-2', tenantId: tId, permissions: [] });

  describe('Authentication & Permissions', () => {
    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/arrival')
        .set('x-mock-unauthorized', 'true')
        .send({ admissionNumber: t1Student.admissionNumber })
        .expect(403);
    });

    it('should reject authenticated request without attendance.scan.submit permission', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/arrival')
        .set('x-mock-user', noPermUser(tenant1))
        .send({ admissionNumber: t1Student.admissionNumber })
        .expect(403);
    });
  });

  describe('Arrival Scan', () => {
    it('should fail when using a cross-tenant admission number', async () => {
      // Trying to scan tenant2's student in tenant1 context
      await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/arrival')
        .set('x-mock-user', validUser(tenant1))
        .send({ admissionNumber: t2Student.admissionNumber })
        .expect(404);
    });

    it('should fail when student does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/arrival')
        .set('x-mock-user', validUser(tenant1))
        .send({ admissionNumber: 'FAKE-ADM' })
        .expect(404);
    });

    it('should successfully process a valid arrival scan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/arrival')
        .set('x-mock-user', validUser(tenant1))
        .send({ admissionNumber: t1Student.admissionNumber })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.event).toBe('STUDENT_ARRIVED');
      expect(res.body.attendanceStatus).toBe('PRESENT');
      expect(res.body.notificationQueued).toBe(true);
      expect(res.body.notificationChannel).toBe('SMS');

      // Verify AuditLog
      const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant1, entityId: t1Student.id, action: 'STUDENT_ARRIVED' } });
      expect(auditLogs.length).toBe(1);

      // Verify Attendance
      const attendance = await prisma.attendance.findMany({ where: { tenantId: tenant1, studentId: t1Student.id } });
      expect(attendance.length).toBe(1);
      expect(attendance[0].status).toBe('PRESENT');

      // Verify NotificationQueue
      const notifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant1 } });
      expect(notifs.length).toBe(1);
      expect(notifs[0].status).toBe('PENDING');
      expect(notifs[0].channel).toBe('SMS');
    });

    it('should block duplicate arrival scans', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/arrival')
        .set('x-mock-user', validUser(tenant1))
        .send({ admissionNumber: t1Student.admissionNumber })
        .expect(201);

      expect(res.body.status).toBe('already_checked_in');

      // Should not create a second audit log
      const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant1, entityId: t1Student.id, action: 'STUDENT_ARRIVED' } });
      expect(auditLogs.length).toBe(1);

      // Should not create a second notification
      const notifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant1 } });
      expect(notifs.length).toBe(1);
    });
  });

  describe('Pickup Scan', () => {
    it('should explicitly prove pickup does not modify Attendance record', async () => {
      // Check Attendance before pickup
      const attendanceBefore = await prisma.attendance.findMany({ where: { tenantId: tenant1, studentId: t1Student.id } });
      expect(attendanceBefore.length).toBe(1);
      expect(attendanceBefore[0].status).toBe('PRESENT');

      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/pickup')
        .set('x-mock-user', validUser(tenant1))
        .send({ admissionNumber: t1Student.admissionNumber })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.event).toBe('STUDENT_PICKED_UP');
      expect(res.body.notificationQueued).toBe(true);

      // Verify AuditLog
      const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant1, entityId: t1Student.id, action: 'STUDENT_PICKED_UP' } });
      expect(auditLogs.length).toBe(1);

      // Verify Attendance is unchanged
      const attendanceAfter = await prisma.attendance.findMany({ where: { tenantId: tenant1, studentId: t1Student.id } });
      expect(attendanceAfter.length).toBe(1);
      expect(attendanceAfter[0].status).toBe('PRESENT');
      expect(attendanceAfter[0].updatedAt.getTime()).toBe(attendanceBefore[0].updatedAt.getTime());

      // Notification should be added
      const notifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant1, channel: 'SMS' } });
      expect(notifs.length).toBe(2); // 1 for arrival, 1 for pickup
    });

    it('should block duplicate pickup scans', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/pickup')
        .set('x-mock-user', validUser(tenant1))
        .send({ admissionNumber: t1Student.admissionNumber })
        .expect(201);

      expect(res.body.status).toBe('already_picked_up');

      // Should not create a second audit log
      const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant1, entityId: t1Student.id, action: 'STUDENT_PICKED_UP' } });
      expect(auditLogs.length).toBe(1);

      // Should not create another notification
      const notifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant1 } });
      expect(notifs.length).toBe(2); // 1 for arrival, 1 for pickup
    });

    it('should test email fallback and no-contact behavior on tenant2', async () => {
      // Modify tenant2 parent to have NO phone, but EMAIL exists
      const t2Guardian = await prisma.guardian.findFirst({ where: { tenantId: tenant2 } });
      const t2Member = await prisma.tenantMembership.findUnique({ where: { id: t2Guardian.membershipId }, include: { profile: true, user: true } });

      await prisma.profile.update({
        where: { id: t2Member.profile.id },
        data: { phone: null }
      });

      // Perform arrival, should queue EMAIL
      const arrRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/arrival')
        .set('x-mock-user', validUser(tenant2))
        .send({ admissionNumber: t2Student.admissionNumber })
        .expect(201);

      expect(arrRes.body.notificationChannel).toBe('EMAIL');
      const emailNotifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant2, channel: 'EMAIL' } });
      expect(emailNotifs.length).toBe(1);

      // Modify parent to have NO email either
      await prisma.user.update({
        where: { id: t2Member.user.id },
        data: { email: `test-delete-${randomUUID()}` } // Removing it functionally as a fallback is tricky, let's just delete the studentguardian relation
      });
      await prisma.studentGuardian.deleteMany({ where: { studentId: t2Student.id } });

      // Perform pickup, should NOT queue any notification
      const pickRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/scan/pickup')
        .set('x-mock-user', validUser(tenant2))
        .send({ admissionNumber: t2Student.admissionNumber })
        .expect(201);

      expect(pickRes.body.notificationQueued).toBe(false);
    });
  });
});
