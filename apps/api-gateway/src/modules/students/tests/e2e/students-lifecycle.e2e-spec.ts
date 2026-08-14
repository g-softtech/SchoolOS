import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });
console.log("DATABASE_URL:", process.env.DATABASE_URL);
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService as CorePrismaService } from '@saas/core-platform';
import { StudentsModule } from '../../students.module';
import { IdentityModule } from '../../../identity/identity.module';
import { DatabaseModule } from '../../../../database/database.module';
import { PrismaService } from '../../../../database/prisma.service';
import { EventDispatcher, PlatformEventBus } from '@saas/core-platform';
import { randomUUID } from 'crypto';
import { TenantMembershipRepository } from '../../../identity/repositories/tenant-membership.repository';

// Stub CorePlatformModule that provides no own PrismaService —
// it delegates to the DatabaseModule PrismaService via global registry.
@Global()
@Module({
  providers: [
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
    { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
  ],
  exports: ['CACHE_PROVIDER', 'CACHE_MANAGER'],
})
class GlobalCacheModule {}

describe('Students Lifecycle (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let eventDispatcher: EventDispatcher;
  let eventBus: PlatformEventBus;
  let membershipRepo: TenantMembershipRepository;

  const tenantSuffix = Date.now().toString();
  const tenantId = `e2e-std-tenant-${tenantSuffix}`;
  let planId: string;

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
        {
          provide: EventDispatcher,
          useValue: { dispatch: jest.fn(), registerHandler: jest.fn() },
        },
        PlatformEventBus
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    eventDispatcher = moduleFixture.get(EventDispatcher);
    eventBus = moduleFixture.get(PlatformEventBus);
    membershipRepo = moduleFixture.get(TenantMembershipRepository);

    await app.init();

    // Setup Tenant in DB
    const plan = await prisma.platformPlan.findFirst();
    planId = plan?.id || (await prisma.platformPlan.create({
      data: {
        name: 'Basic',
        priceMonthly: 0,
        priceYearly: 0,
        features: {}
      }
    })).id;

    await prisma.tenant.upsert({
      where: { id: tenantId },
      create: {
        id: tenantId,
        name: 'E2E Student Tenant',
        slug: `e2e-student-${tenantSuffix}`,
        domains: {
          create: { domain: `e2estudent-${tenantSuffix}.schoolos.com` }
        },
        status: 'ACTIVE',
        planId,
        subscriptions: {
          create: {
            planId,
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000)
          }
        }
      },
      update: {}
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await app.close();
  });

  describe('Admissions Enrollment Handoff', () => {
    const applicationId = randomUUID();
    const studentFirstName = 'John';
    const studentLastName = 'Doe';
    const studentDateOfBirth = '2010-05-15T00:00:00Z';

    it('should create Identity and Student records when Enrolled event is received', async () => {
      // 1. Emit the event
      await eventBus.publish({
        eventName: 'Admissions.Application.Enrolled',
        version: 1,
        occurredAt: new Date().toISOString(),
        payload: {
          tenantId,
          applicationId,
          studentFirstName,
          studentLastName,
          studentDateOfBirth
        }
      });

      // Give event loop time to process the async event
      const surrogateEmail = `student-${applicationId}@${tenantId}.system.internal`;
      let user: any = null;
      for (let i = 0; i < 20; i++) {
        user = await prisma.user.findUnique({ where: { email: surrogateEmail } });
        if (user) break;
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // 2. Verify User
      expect(user).toBeDefined();
      expect(user).not.toBeNull();
      expect(user?.globalRole).toBe('USER');

      // 3. Verify Membership and Profile
      const membership = await prisma.tenantMembership.findFirst({
        where: { tenantId, userId: user?.id },
        include: { profile: true, role: true }
      });
      expect(membership).toBeDefined();
      expect(membership?.role.name).toBe('STUDENT');
      expect(membership?.profile?.firstName).toBe(studentFirstName);
      expect(membership?.profile?.lastName).toBe(studentLastName);

      // 4. Verify Student
      const student = await prisma.student.findUnique({
        where: { membershipId: membership?.id }
      });
      expect(student).toBeDefined();
      expect(student?.tenantId).toBe(tenantId);
      expect(student?.admissionNumber).toBeDefined();
    });

    it('should be idempotent if the event is delivered twice', async () => {
      // Count records before second delivery
      const beforeUsers = await prisma.user.count({ where: { email: `student-${applicationId}@${tenantId}.system.internal` } });
      const beforeMemberships = await prisma.tenantMembership.count({ where: { tenantId } });
      const beforeStudents = await prisma.student.count({ where: { tenantId } });

      // 1. Emit the same event again
      await eventBus.publish({
        eventName: 'Admissions.Application.Enrolled',
        version: 1,
        occurredAt: new Date().toISOString(),
        payload: {
          tenantId,
          applicationId,
          studentFirstName,
          studentLastName,
          studentDateOfBirth
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Count records after second delivery
      const afterUsers = await prisma.user.count({ where: { email: `student-${applicationId}@${tenantId}.system.internal` } });
      const afterMemberships = await prisma.tenantMembership.count({ where: { tenantId } });
      const afterStudents = await prisma.student.count({ where: { tenantId } });

      // 3. Verify no new records were created
      expect(afterUsers).toBe(beforeUsers);
      expect(afterMemberships).toBe(beforeMemberships);
      expect(afterStudents).toBe(beforeStudents);
    });
  });
});
