import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../../../database/database.module';
import { PrismaService } from '../../../../database/prisma.service';
import { AcademicsModule } from '../../academics.module';
import { InstitutionalStructureService } from '../../services/institutional-structure.service';
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

describe('Institutional Structure (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let service: InstitutionalStructureService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-acad-tenant1-${tenantSuffix}`;
  const tenant2 = `e2e-acad-tenant2-${tenantSuffix}`;
  let planId: string;

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
    service = moduleFixture.get(InstitutionalStructureService);
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
          name: `E2E Acad Tenant ${tId}`,
          slug: `e2e-acad-${tId}`,
          status: 'ACTIVE',
          planId,
          subscriptions: {
            create: { planId, currentPeriodEnd: new Date(Date.now() + 30 * 86400000) }
          }
        },
        update: {}
      });
    }
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    await app.close();
  });

  describe('Tenant Isolation', () => {
    let t1Class: any;
    let t2Class: any;
    let t1Subject: any;

    it('should create classes and subjects properly scoped to tenants', async () => {
      t1Class = await service.createClass(tenant1, { name: 'Grade 10', level: 10 });
      t2Class = await service.createClass(tenant2, { name: 'Grade 10', level: 10 });
      t1Subject = await service.createSubject(tenant1, { name: 'Math', code: 'MTH' });

      expect(t1Class.tenantId).toBe(tenant1);
      expect(t2Class.tenantId).toBe(tenant2);
      expect(t1Subject.tenantId).toBe(tenant1);
    });

    it('should prevent creating an arm in a class belonging to another tenant', async () => {
      await expect(
        service.createArm(tenant1, { classId: t2Class.id, name: '10A' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent mapping a subject from another tenant', async () => {
      await expect(
        service.mapClassSubjects(tenant2, t2Class.id, [t1Subject.id])
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow mapping subjects within the same tenant', async () => {
      const updatedClass = await service.mapClassSubjects(tenant1, t1Class.id, [t1Subject.id]);
      expect(updatedClass.subjects.length).toBe(1);
      expect(updatedClass.subjects[0].id).toBe(t1Subject.id);
    });
  });
});
