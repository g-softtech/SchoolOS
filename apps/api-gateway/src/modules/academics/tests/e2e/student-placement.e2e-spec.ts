import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../../../database/database.module';
import { PrismaService } from '../../../../database/prisma.service';
import { AcademicsModule } from '../../academics.module';
import { StudentPlacementService } from '../../services/student-placement.service';
import { NotFoundException } from '@nestjs/common';
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

describe('Student Placement (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let placementService: StudentPlacementService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-place-t1-${tenantSuffix}`;
  const tenant2 = `e2e-place-t2-${tenantSuffix}`;
  let planId: string;

  let t1ArmId: string;
  let t2ArmId: string;
  let t1StudentId: string;
  let t2StudentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        GlobalCacheModule,
        EventEmitterModule.forRoot(),
        AcademicsModule,
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    placementService = moduleFixture.get(StudentPlacementService);
    await app.init();

    // Setup Tenants
    const plan = await prisma.platformPlan.findFirst();
    planId = plan?.id || (await prisma.platformPlan.create({
      data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }
    })).id;

    for (const tId of [tenant1, tenant2]) {
      await prisma.tenant.upsert({
        where: { id: tId },
        create: {
          id: tId,
          name: `E2E Place Tenant ${tId}`,
          slug: tId,
          status: 'ACTIVE',
          planId,
        },
        update: {}
      });
    }

    // Seed Classes and Arms
    const c1 = await prisma.class.create({ data: { tenantId: tenant1, name: 'Grade 10', level: 10 } });
    const a1 = await prisma.arm.create({ data: { tenantId: tenant1, classId: c1.id, name: '10A' } });
    t1ArmId = a1.id;

    const c2 = await prisma.class.create({ data: { tenantId: tenant2, name: 'Grade 10', level: 10 } });
    const a2 = await prisma.arm.create({ data: { tenantId: tenant2, classId: c2.id, name: '10A' } });
    t2ArmId = a2.id;

    // Seed Dummy User and Role
    const u1 = await prisma.user.create({
      data: { email: `e2e-place-${tenantSuffix}@test.com` }
    });
    const r1 = await prisma.role.create({
      data: { tenantId: tenant1, name: 'STUDENT' }
    });
    
    // Seed Dummy Students (Needs memberships since it's required)
    const m1 = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1,
        roleId: r1.id,
        userId: u1.id
      }
    });
    const s1 = await prisma.student.create({
      data: {
        tenantId: tenant1,
        membershipId: m1.id,
        admissionNumber: 'T1-001'
      }
    });
    t1StudentId = s1.id;

    const u2 = await prisma.user.create({
      data: { email: `e2e-place2-${tenantSuffix}@test.com` }
    });
    const r2 = await prisma.role.create({
      data: { tenantId: tenant2, name: 'STUDENT' }
    });
    const m2 = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant2,
        roleId: r2.id,
        userId: u2.id
      }
    });
    const s2 = await prisma.student.create({
      data: {
        tenantId: tenant2,
        membershipId: m2.id,
        admissionNumber: 'T2-001'
      }
    });
    t2StudentId = s2.id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    await app.close();
  });

  describe('Placement Tenant Isolation', () => {
    it('Tenant A cannot place a Tenant A student into a Tenant B arm', async () => {
      await expect(
        placementService.placeStudentInArm(tenant1, t1StudentId, { armId: t2ArmId })
      ).rejects.toThrow(NotFoundException);
    });

    it('Tenant A cannot place a Tenant B student into a Tenant A arm', async () => {
      await expect(
        placementService.placeStudentInArm(tenant1, t2StudentId, { armId: t1ArmId })
      ).rejects.toThrow(NotFoundException);
    });

    it('Tenant A can successfully place a Tenant A student into a Tenant A arm', async () => {
      const student = await placementService.placeStudentInArm(tenant1, t1StudentId, { armId: t1ArmId });
      expect(student.currentArmId).toBe(t1ArmId);
      
      const dbStudent = await prisma.student.findUnique({ where: { id: t1StudentId } });
      expect(dbStudent?.currentArmId).toBe(t1ArmId);
    });
  });
});
