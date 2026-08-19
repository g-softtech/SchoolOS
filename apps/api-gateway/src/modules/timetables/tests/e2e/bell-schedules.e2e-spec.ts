import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../../../database/database.module';
import { PrismaService } from '../../../../database/prisma.service';
import { TimetablesModule } from '../../timetables.module';
import { BellScheduleService } from '../../services/bell-schedule.service';
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

describe('Bell Schedules (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let service: BellScheduleService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-tt-tenant1-${tenantSuffix}`;
  const tenant2 = `e2e-tt-tenant2-${tenantSuffix}`;
  let planId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        GlobalCacheModule,
        EventEmitterModule.forRoot(),
        TimetablesModule,
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    service = moduleFixture.get(BellScheduleService);
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
          name: `E2E TT Tenant ${tId}`,
          slug: `e2e-tt-${tId}`,
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

  describe('Tenant Isolation & Validation', () => {
    let t1Schedule: any;

    it('should create bell schedule properly scoped to tenant', async () => {
      t1Schedule = await service.create(tenant1, {
        name: 'Standard Schedule',
        periods: [
          { id: '1', name: 'P1', startTime: '08:00', endTime: '08:45' },
          { id: '2', name: 'P2', startTime: '08:45', endTime: '09:30' }
        ]
      });

      expect(t1Schedule.tenantId).toBe(tenant1);
      expect(t1Schedule.name).toBe('Standard Schedule');
      expect((t1Schedule.periods as any).length).toBe(2);
    });

    it('should prevent another tenant from viewing the schedule', async () => {
      await expect(
        service.findOne(t1Schedule.id, tenant2)
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent another tenant from updating the schedule', async () => {
      await expect(
        service.update(t1Schedule.id, tenant2, { name: 'Hacked', periods: [] })
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent another tenant from deleting the schedule', async () => {
      await expect(
        service.remove(t1Schedule.id, tenant2)
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow the owner tenant to update the schedule', async () => {
      const updated = await service.update(t1Schedule.id, tenant1, {
        name: 'Standard Schedule v2',
        periods: [
          { id: '1', name: 'P1', startTime: '08:00', endTime: '08:45' },
        ]
      });

      expect(updated.name).toBe('Standard Schedule v2');
      expect((updated.periods as any).length).toBe(1);
    });

    it('should block overlapping periods', async () => {
      await expect(
        service.create(tenant1, {
          name: 'Invalid Schedule',
          periods: [
            { id: '1', name: 'P1', startTime: '08:00', endTime: '09:00' },
            { id: '2', name: 'P2', startTime: '08:30', endTime: '09:30' }
          ]
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
