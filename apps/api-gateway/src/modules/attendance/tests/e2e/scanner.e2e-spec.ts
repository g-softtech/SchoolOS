import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule, PrismaService } from '@saas/core-platform';
import { AttendanceModule } from '../../attendance.module';
import { ScannerService } from '../../services/scanner.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@Global()
@Module({
  providers: [
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
    { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
  ],
  exports: ['CACHE_PROVIDER', 'CACHE_MANAGER'],
})
class GlobalCacheModule {}

describe('Scanner Module (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let scannerService: ScannerService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-scan-tenant1-${tenantSuffix}`;
  const tenant2 = `e2e-scan-tenant2-${tenantSuffix}`;
  
  let t1Student: any, t2Student: any;
  let staffUserId = `staff-user-${tenantSuffix}`;

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
    prisma = moduleFixture.get(PrismaService);
    scannerService = moduleFixture.get(ScannerService);
    await app.init();

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

      const stUser = await prisma.user.create({
        data: {
          email: `student-${tId}@test.com`,
          memberships: {
            create: {
              tenantId: tId,
              roleId: 'mock-role',
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
              roleId: 'mock-role',
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
          status: 'ACTIVE'
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
      } else {
        t2Student = studentRec;
      }
    }
  });

  afterAll(async () => {
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
    await app.close();
  });

  describe('Arrival Scan', () => {
    it('should successfully process a valid arrival scan', async () => {
      const res = await scannerService.processArrival(tenant1, t1Student.admissionNumber, staffUserId);
      expect(res.status).toBe('success');
      expect(res.event).toBe('STUDENT_ARRIVED');
      expect(res.attendanceStatus).toBe('PRESENT');
      expect(res.notificationQueued).toBe(true);
      expect(res.notificationChannel).toBe('SMS'); // Because the parent has a phone number
      
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
      const res = await scannerService.processArrival(tenant1, t1Student.admissionNumber, staffUserId);
      expect(res.status).toBe('already_checked_in');
      
      // Should not create a second audit log
      const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant1, entityId: t1Student.id, action: 'STUDENT_ARRIVED' } });
      expect(auditLogs.length).toBe(1);

      // Should not create a second notification
      const notifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant1 } });
      expect(notifs.length).toBe(1);
    });

    it('should fail when using a cross-tenant admission number', async () => {
      // Trying to scan tenant2's student in tenant1
      await expect(
        scannerService.processArrival(tenant1, t2Student.admissionNumber, staffUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail when student does not exist', async () => {
      await expect(
        scannerService.processArrival(tenant1, 'FAKE-ADM', staffUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Pickup Scan', () => {
    it('should successfully process a valid pickup scan', async () => {
      const res = await scannerService.processPickup(tenant1, t1Student.admissionNumber, staffUserId);
      expect(res.status).toBe('success');
      expect(res.event).toBe('STUDENT_PICKED_UP');
      expect(res.notificationQueued).toBe(true);

      // Verify AuditLog
      const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant1, entityId: t1Student.id, action: 'STUDENT_PICKED_UP' } });
      expect(auditLogs.length).toBe(1);

      // Notification should be added
      const notifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant1 } });
      expect(notifs.length).toBe(2); // 1 for arrival, 1 for pickup
    });

    it('should block duplicate pickup scans', async () => {
      const res = await scannerService.processPickup(tenant1, t1Student.admissionNumber, staffUserId);
      expect(res.status).toBe('already_picked_up');
      
      // Should not create a second audit log
      const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant1, entityId: t1Student.id, action: 'STUDENT_PICKED_UP' } });
      expect(auditLogs.length).toBe(1);

      // Should not create another notification
      const notifs = await prisma.notificationQueue.findMany({ where: { tenantId: tenant1 } });
      expect(notifs.length).toBe(2);
    });
  });
});
