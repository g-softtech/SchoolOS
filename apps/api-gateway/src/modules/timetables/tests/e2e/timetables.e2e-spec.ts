import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule, PrismaService } from '@saas/core-platform';
import { TimetablesModule } from '../../timetables.module';
import { TimetableService } from '../../services/timetable.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

@Global()
@Module({
  providers: [
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
    { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
  ],
  exports: ['CACHE_PROVIDER', 'CACHE_MANAGER'],
})
class GlobalCacheModule {}

describe('Timetables Grid (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let service: TimetableService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-tt-tenant1-${tenantSuffix}`;
  const tenant2 = `e2e-tt-tenant2-${tenantSuffix}`;
  
  let t1Arm: any, t1Term: any, t1Bell: any, t1Subject: any, t1Class: any;
  let t2Arm: any, t2Term: any, t2Bell: any, t2Subject: any, t2Class: any;
  let t1StaffId: string, t2StaffId: string, t1TerminatedStaffId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        GlobalCacheModule,
        EventEmitterModule.forRoot(),
        TimetablesModule,
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    service = moduleFixture.get(TimetableService);
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
          name: `E2E TT Tenant ${tId}`,
          slug: `e2e-tt-t-${tId}`,
          status: 'ACTIVE',
          planId,
          subscriptions: { create: { planId, currentPeriodEnd: new Date(Date.now() + 30 * 86400000) } }
        },
        update: {}
      });
    }

    // 2. Base academic data for T1
    const t1Year = await prisma.academicYear.create({
      data: { tenantId: tenant1, name: '2025/2026', startDate: new Date(), endDate: new Date(), status: 'ACTIVE' }
    });
    t1Term = await prisma.term.create({
      data: { tenantId: tenant1, academicYearId: t1Year.id, name: 'Term 1', startDate: new Date(), endDate: new Date() }
    });
    t1Class = await prisma.class.create({
      data: { tenantId: tenant1, name: 'Grade 10', level: 10 }
    });
    t1Arm = await prisma.arm.create({
      data: { tenantId: tenant1, classId: t1Class.id, name: '10A', capacity: 30 }
    });
    t1Subject = await prisma.subject.create({
      data: { tenantId: tenant1, name: 'Math', code: 'MTH' }
    });
    t1Bell = await prisma.bellSchedule.create({
      data: { tenantId: tenant1, name: 'T1 Bell', periods: [{ id: 'p1', name: 'P1', startTime: '08:00', endTime: '08:45' }] }
    });

    // 3. Base academic data for T2
    const t2Year = await prisma.academicYear.create({
      data: { tenantId: tenant2, name: '2025/2026', startDate: new Date(), endDate: new Date(), status: 'ACTIVE' }
    });
    t2Term = await prisma.term.create({
      data: { tenantId: tenant2, academicYearId: t2Year.id, name: 'Term 1', startDate: new Date(), endDate: new Date() }
    });
    t2Class = await prisma.class.create({
      data: { tenantId: tenant2, name: 'Grade 10', level: 10 }
    });
    t2Arm = await prisma.arm.create({
      data: { tenantId: tenant2, classId: t2Class.id, name: '10B', capacity: 30 }
    });
    t2Subject = await prisma.subject.create({
      data: { tenantId: tenant2, name: 'English', code: 'ENG' }
    });
    t2Bell = await prisma.bellSchedule.create({
      data: { tenantId: tenant2, name: 'T2 Bell', periods: [{ id: 'p1', name: 'P1', startTime: '08:00', endTime: '08:45' }] }
    });

    // 4. Staff Data
    // T1 Active Staff
    const t1StaffUser = await prisma.user.create({ data: { email: `t1-staff-${tenantSuffix}@test.com`, name: 'T1 Staff', authProviderId: 'dummy' }});
    const t1StaffProfile = await prisma.profile.create({ data: { firstName: 'T1', lastName: 'Staff', dateOfBirth: new Date() }});
    const t1StaffMembership = await prisma.tenantMembership.create({ data: { tenantId: tenant1, userId: t1StaffUser.id, roleId: (await prisma.role.findFirst({ where: { name: 'STAFF' }})).id, profileId: t1StaffProfile.id, state: 'ACTIVE' }});
    const t1Staff = await prisma.staff.create({ data: { tenantId: tenant1, membershipId: t1StaffMembership.id, staffIdNumber: 'T1-001', employment: { create: { status: 'ACTIVE', startDate: new Date() } } }});
    t1StaffId = t1Staff.id;

    // T2 Active Staff (for cross-tenant test)
    const t2StaffUser = await prisma.user.create({ data: { email: `t2-staff-${tenantSuffix}@test.com`, name: 'T2 Staff', authProviderId: 'dummy' }});
    const t2StaffProfile = await prisma.profile.create({ data: { firstName: 'T2', lastName: 'Staff', dateOfBirth: new Date() }});
    const t2StaffMembership = await prisma.tenantMembership.create({ data: { tenantId: tenant2, userId: t2StaffUser.id, roleId: (await prisma.role.findFirst({ where: { name: 'STAFF' }})).id, profileId: t2StaffProfile.id, state: 'ACTIVE' }});
    const t2Staff = await prisma.staff.create({ data: { tenantId: tenant2, membershipId: t2StaffMembership.id, staffIdNumber: 'T2-001', employment: { create: { status: 'ACTIVE', startDate: new Date() } } }});
    t2StaffId = t2Staff.id;

    // T1 Terminated Staff
    const t1TermUser = await prisma.user.create({ data: { email: `t1-term-${tenantSuffix}@test.com`, name: 'T1 Term', authProviderId: 'dummy' }});
    const t1TermProfile = await prisma.profile.create({ data: { firstName: 'T1', lastName: 'Term', dateOfBirth: new Date() }});
    const t1TermMembership = await prisma.tenantMembership.create({ data: { tenantId: tenant1, userId: t1TermUser.id, roleId: (await prisma.role.findFirst({ where: { name: 'STAFF' }})).id, profileId: t1TermProfile.id, state: 'ACTIVE' }});
    const t1TermStaff = await prisma.staff.create({ data: { tenantId: tenant1, membershipId: t1TermMembership.id, staffIdNumber: 'T1-002', employment: { create: { status: 'TERMINATED', startDate: new Date(), endDate: new Date() } } }});
    t1TerminatedStaffId = t1TermStaff.id;
  });

  afterAll(async () => {
    try {
      await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    } catch (e) {
      console.error(e);
    }
    if (app) {
      await app.close();
    }
  });

  describe('Timetable Creation & Tenant Isolation', () => {
    let t1Timetable: any;

    it('should create timetable for T1', async () => {
      t1Timetable = await service.create(tenant1, {
        armId: t1Arm.id,
        termId: t1Term.id,
        bellScheduleId: t1Bell.id
      });
      expect(t1Timetable.tenantId).toBe(tenant1);
    });

    it('should block creating another timetable for same Arm/Term', async () => {
      await expect(
        service.create(tenant1, { armId: t1Arm.id, termId: t1Term.id, bellScheduleId: t1Bell.id })
      ).rejects.toThrow(ConflictException);
    });

    it('should block creating timetable using another tenants Arm', async () => {
      await expect(
        service.create(tenant1, { armId: t2Arm.id, termId: t1Term.id, bellScheduleId: t1Bell.id })
      ).rejects.toThrow(NotFoundException);
    });

    it('should block bulk updating slots with another tenants subject', async () => {
      await expect(
        service.bulkUpdateSlots(t1Timetable.id, tenant1, {
          slots: [{ dayOfWeek: 1, periodId: 'p1', subjectId: t2Subject.id }]
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should block bulk updating slots for a timetable owned by someone else', async () => {
      await expect(
        service.bulkUpdateSlots(t1Timetable.id, tenant2, { slots: [] })
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update slots and derive classId and unassigned teacher', async () => {
      const slots = await service.bulkUpdateSlots(t1Timetable.id, tenant1, {
        slots: [{ dayOfWeek: 1, periodId: 'p1', subjectId: t1Subject.id }]
      });
      expect(slots.length).toBe(1);
      expect(slots[0].classId).toBe(t1Class.id); // Derived from Arm automatically
      expect(slots[0].teacherId).toBe('UNASSIGNED'); // Phase 11 sentinel
    });

    it('should reject assigning a cross-tenant Staff ID', async () => {
      await expect(
        service.bulkUpdateSlots(t1Timetable.id, tenant1, {
          slots: [{ dayOfWeek: 1, periodId: 'p1', subjectId: t1Subject.id, teacherId: t2StaffId }]
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject assigning a terminated Staff ID', async () => {
      await expect(
        service.bulkUpdateSlots(t1Timetable.id, tenant1, {
          slots: [{ dayOfWeek: 1, periodId: 'p1', subjectId: t1Subject.id, teacherId: t1TerminatedStaffId }]
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully assign a valid ACTIVE Staff ID', async () => {
      const slots = await service.bulkUpdateSlots(t1Timetable.id, tenant1, {
        slots: [{ dayOfWeek: 1, periodId: 'p1', subjectId: t1Subject.id, teacherId: t1StaffId }]
      });
      expect(slots.length).toBe(1);
      expect(slots[0].teacherId).toBe(t1StaffId);
    });

    it('should enforce UNASSIGNED if slot has no subject', async () => {
      const slots = await service.bulkUpdateSlots(t1Timetable.id, tenant1, {
        slots: [{ dayOfWeek: 1, periodId: 'p1', subjectId: '', teacherId: t1StaffId }]
      });
      expect(slots.length).toBe(1);
      expect(slots[0].subjectId).toBe('');
      expect(slots[0].teacherId).toBe('UNASSIGNED'); // Enforced by backend safety rule
    });

    it('should lookup timetable by armId and termId successfully', async () => {
      const timetable = await service.findByArmAndTermWithSlots(t1Arm.id, t1Term.id, tenant1);
      expect(timetable.id).toBe(t1Timetable.id);
      expect(timetable.TimetableSlot).toBeDefined();
      expect(timetable.TimetableSlot.length).toBe(1);
      // It should have the state from the last valid update (no subject, UNASSIGNED)
      expect(timetable.TimetableSlot[0].subjectId).toBe('');
      expect(timetable.TimetableSlot[0].teacherId).toBe('UNASSIGNED');
    });

    it('should block looking up another tenants timetable', async () => {
      await expect(
        service.findByArmAndTermWithSlots(t1Arm.id, t1Term.id, tenant2)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound when timetable does not exist', async () => {
      await expect(
        service.findByArmAndTermWithSlots(t2Arm.id, t2Term.id, tenant2) // Has not been created yet
      ).rejects.toThrow(NotFoundException);
    });
  });
});
