import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule, PrismaService, AttendanceStatus, LeaveType, LeaveStatus } from '@saas/core-platform';
import { AttendanceModule } from '../../attendance.module';
import { AttendanceService } from '../../services/attendance.service';
import { LeaveService } from '../../services/leave.service';

@Global()
@Module({
  providers: [
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
    { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
  ],
  exports: ['CACHE_PROVIDER', 'CACHE_MANAGER'],
})
class GlobalCacheModule {}

describe('Attendance Module (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let attendanceService: AttendanceService;
  let leaveService: LeaveService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-att-tenant1-${tenantSuffix}`;
  const tenant2 = `e2e-att-tenant2-${tenantSuffix}`;
  
  let t1Arm: any, t2Arm: any;
  let t1Student: any, t2Student: any;
  let t1Staff: any, t2Staff: any;

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
    attendanceService = moduleFixture.get(AttendanceService);
    leaveService = moduleFixture.get(LeaveService);
    await app.init();

    // 1. Plan & Tenants
    const plan = await prisma.platformPlan.findFirst();
    const planId = plan?.id || (await prisma.platformPlan.create({
      data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }
    })).id;

    for (const tId of [tenant1, tenant2]) {
      await prisma.tenant.upsert({
        where: { id: tId },
        create: {
          id: tId,
          name: `E2E Att Tenant ${tId}`,
          slug: `e2e-att-t-${tId}`,
          status: 'ACTIVE',
          planId,
          subscriptions: { create: { planId, currentPeriodEnd: new Date(Date.now() + 30 * 86400000) } }
        },
        update: {}
      });

      // Role
      const role = await prisma.role.create({
        data: { tenantId: tId, name: `STAFF_${tId}`, isSystem: true }
      });
      const studentRole = await prisma.role.create({
        data: { tenantId: tId, name: `STUDENT_${tId}`, isSystem: true }
      });

      // Staff user
      const sUser = await prisma.user.create({
        data: {
          email: `staff-${tId}@e2e.com`,
          passwordHash: 'hash',
          emailVerified: new Date(),
          memberships: {
            create: {
              tenantId: tId,
              roleId: role.id,
              state: 'ACTIVE',
              profile: {
                create: { firstName: 'Staff', lastName: 'User' }
              }
            }
          }
        },
        include: { memberships: true }
      });

      const staffRec = await prisma.staff.create({
        data: {
          tenantId: tId,
          membershipId: sUser.memberships[0].id,
          staffIdNumber: `STF-${tId}`,
          employment: { create: { tenantId: tId, status: 'ACTIVE', contractType: 'FULL_TIME', hireDate: new Date() } }
        }
      });

      // Student user
      const stUser = await prisma.user.create({
        data: {
          email: `student-${tId}@e2e.com`,
          passwordHash: 'hash',
          emailVerified: new Date(),
          memberships: {
            create: {
              tenantId: tId,
              roleId: studentRole.id,
              state: 'ACTIVE',
              profile: {
                create: { firstName: 'Student', lastName: 'User' }
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
          admissionNumber: `ADM-${tId}`,
          currentArmId: arm.id,
        }
      });

      if (tId === tenant1) {
        t1Staff = staffRec;
        t1Arm = arm;
        t1Student = studentRec;
      } else {
        t2Staff = staffRec;
        t2Arm = arm;
        t2Student = studentRec;
      }
    }
  });

  afterAll(async () => {
    try {
      await prisma.attendance.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.leaveRequest.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.student.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.staff.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.arm.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.class.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.tenantMembership.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.role.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    } finally {
      await prisma.$disconnect();
      await app.close();
    }
  });

  describe('AttendanceService (Tenant Isolation)', () => {
    it('should successfully record attendance for valid arm and students', async () => {
      const records = await attendanceService.recordDailyAttendance(tenant1, t1Arm.id, new Date('2026-08-22'), [
        { studentId: t1Student.id, status: AttendanceStatus.PRESENT }
      ]);
      expect(records.length).toBe(1);
      expect(records[0].studentId).toBe(t1Student.id);
      expect(records[0].status).toBe(AttendanceStatus.PRESENT);
    });

    it('should reject recording attendance if Arm belongs to another tenant', async () => {
      await expect(
        attendanceService.recordDailyAttendance(tenant1, t2Arm.id, new Date('2026-08-22'), [
          { studentId: t1Student.id, status: AttendanceStatus.PRESENT }
        ])
      ).rejects.toThrow('Arm not found');
    });

    it('should reject recording attendance if Student belongs to another tenant', async () => {
      await expect(
        attendanceService.recordDailyAttendance(tenant1, t1Arm.id, new Date('2026-08-22'), [
          { studentId: t2Student.id, status: AttendanceStatus.PRESENT }
        ])
      ).rejects.toThrow('One or more students are invalid');
    });
  });

  describe('LeaveService (Tenant Isolation)', () => {
    it('should submit leave request for valid staff', async () => {
      const leave = await leaveService.submitLeaveRequest(tenant1, t1Staff.id, LeaveType.SICK, new Date(), new Date());
      expect(leave).toBeDefined();
      expect(leave.staffId).toBe(t1Staff.id);
      expect(leave.status).toBe(LeaveStatus.PENDING);
    });

    it('should reject leave request if Staff belongs to another tenant', async () => {
      await expect(
        leaveService.submitLeaveRequest(tenant1, t2Staff.id, LeaveType.SICK, new Date(), new Date())
      ).rejects.toThrow('Staff member not found');
    });
  });
});
