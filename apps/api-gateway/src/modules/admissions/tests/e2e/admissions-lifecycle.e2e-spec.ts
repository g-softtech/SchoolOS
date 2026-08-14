import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaClient, CorePlatformModule } from '@saas/core-platform';
import { PrismaService as CorePrismaService } from '@saas/core-platform';
import { AdmissionsModule } from '../../admissions.module';
import { AdmissionApplicationService } from '../../services/admission-application.service';
import { AdmissionWorkflowService } from '../../services/admission-workflow.service';
import { AdmissionCampaignService } from '../../services/admission-campaign.service';
import { AdmissionReviewService } from '../../services/admission-review.service';
import { DatabaseModule } from '../../../../database/database.module';
import { PrismaService } from '../../../../database/prisma.service';
import { EventDispatcher, OutboxService, IdempotencyService, DomainEventPublisher, EventEmitterPublisher, PlatformStorageService, PlatformEventBus } from '@saas/core-platform';

// Stub CorePlatformModule that provides no own PrismaService —
// it delegates to the DatabaseModule PrismaService via global registry.
@Global()
@Module({
  providers: [
    { provide: 'CACHE_PROVIDER', useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
  ],
  exports: ['CACHE_PROVIDER'],
})
class GlobalCacheModule {}

describe('Admissions Lifecycle (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let applicationService: AdmissionApplicationService;
  let workflowService: AdmissionWorkflowService;
  let campaignService: AdmissionCampaignService;
  let reviewService: AdmissionReviewService;
  let eventDispatcher: EventDispatcher;

  const tenant1 = 'e2e-adm-tenant-1';
  const tenant2 = 'e2e-adm-tenant-2';
  let planId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,    // sole owner of PrismaService
        GlobalCacheModule,
        EventEmitterModule.forRoot(),
        AdmissionsModule,
      ],
      providers: [
        // Alias PrismaClient token → DatabaseModule's PrismaService
        { provide: PrismaClient, useExisting: PrismaService },
        // Re-expose core platform services bound to the single PrismaService
        OutboxService,
        PlatformStorageService,
        PlatformEventBus,
        { provide: DomainEventPublisher, useClass: EventEmitterPublisher },
        EventDispatcher,
        IdempotencyService,
      ],
    })
      // Override CorePlatformModule inside AdmissionsModule to prevent it
      // from instantiating its own PrismaService (which exhausts the Neon pool)
      .overrideModule(CorePlatformModule)
      .useModule(
        (() => {
          @Module({
            providers: [
              { provide: PrismaClient, useExisting: PrismaService },
              { provide: CorePrismaService, useExisting: PrismaService },
              OutboxService,
              PlatformStorageService,
              PlatformEventBus,
            ],
            exports: [PrismaClient, CorePrismaService, OutboxService, PlatformStorageService, PlatformEventBus],
          })
          class CorePlatformStubModule {}
          return CorePlatformStubModule;
        })()
      )
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);

    applicationService = app.get(AdmissionApplicationService);
    workflowService = app.get(AdmissionWorkflowService);
    campaignService = app.get(AdmissionCampaignService);
    reviewService = app.get(AdmissionReviewService);
    eventDispatcher = app.get(EventDispatcher);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up E2E tables in dependency order (children first)
    await prisma.outboxQueue.deleteMany({});
    await prisma.domainEventLog.deleteMany({});
    
    await prisma.admissionReview.deleteMany({ where: { application: { tenantId: { in: [tenant1, tenant2] } } } });
    await prisma.admissionApplication.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await prisma.admissionCampaign.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await prisma.admissionWorkflowStage.deleteMany({ where: { workflow: { tenantId: { in: [tenant1, tenant2] } } } });
    await prisma.admissionWorkflow.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await prisma.academicYear.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });

    // Find all E2E plans (by name) and delete ALL tenants referencing them first (FK order)
    const oldPlans = await prisma.platformPlan.findMany({ where: { name: 'E2E Test Plan' } });
    const oldPlanIds = oldPlans.map((p) => p.id);
    if (oldPlanIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { planId: { in: oldPlanIds } } });
    }
    // Also delete by known slug/id in case some have a different plan
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    await prisma.tenant.deleteMany({ where: { slug: { in: ['e2e-adm-tenant-1', 'e2e-adm-tenant-2'] } } });
    // Now all tenant FK refs are gone — safe to delete old plans
    if (oldPlanIds.length > 0) {
      await prisma.platformPlan.deleteMany({ where: { id: { in: oldPlanIds } } });
    }

    // Seed PlatformPlan
    const plan = await prisma.platformPlan.create({
      data: {
        name: 'E2E Test Plan',
        price: 0,
        entitlements: {},
      }
    });
    planId = plan.id;

    // Seed Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenant1, name: 'E2E Adm Tenant 1', slug: 'e2e-adm-tenant-1', planId },
        { id: tenant2, name: 'E2E Adm Tenant 2', slug: 'e2e-adm-tenant-2', planId },
      ]
    });
  });

  it('1. Full Admissions Lifecycle: Campaign, Application, Workflow Transition, Review, Enrollment', async () => {
    // 1) Create Academic Year
    const academicYear = await prisma.academicYear.create({
      data: {
        id: 'ay-2027',
        tenantId: tenant1,
        name: '2027-2028',
        startDate: new Date('2027-09-01'),
        endDate: new Date('2028-06-30'),
        status: 'ACTIVE'
      }
    });

    // 2) Create 2 Workflows
    const workflowA = await prisma.admissionWorkflow.create({
      data: {
        tenantId: tenant1,
        name: 'Workflow A (Standard)',
        stages: {
          create: [
            { name: 'Applied', orderIndex: 1 },
            { name: 'Interview', orderIndex: 2 },
            { name: 'Accepted', orderIndex: 3 },
          ]
        }
      },
      include: { stages: true }
    });
    const stageA1 = workflowA.stages.find(s => s.orderIndex === 1)!;
    const stageA2 = workflowA.stages.find(s => s.orderIndex === 2)!;
    
    const workflowB = await prisma.admissionWorkflow.create({
      data: {
        tenantId: tenant1,
        name: 'Workflow B (Express)',
        stages: {
          create: [
            { name: 'Applied', orderIndex: 1 },
            { name: 'Fast-track Accepted', orderIndex: 2 },
          ]
        }
      },
      include: { stages: true }
    });
    const stageB2 = workflowB.stages.find(s => s.orderIndex === 2)!;

    // 3) Create Campaigns tied to the respective workflows
    const campaignA = await campaignService.createCampaign({
      tenantId: tenant1,
      userId: 'admin-1',
    }, {
      name: 'Fall 2027 Standard',
      academicYearId: academicYear.id,
      startDate: new Date('2027-01-01'),
      endDate: new Date('2027-08-31'),
      applicationFee: 50,
      maxApplicants: 100,
      workflowId: workflowA.id // Proving configurable workflows
    });

    const campaignB = await campaignService.createCampaign({
      tenantId: tenant1,
      userId: 'admin-1',
    }, {
      name: 'Fall 2027 Express',
      academicYearId: academicYear.id,
      startDate: new Date('2027-01-01'),
      endDate: new Date('2027-05-31'),
      applicationFee: 150,
      maxApplicants: 20,
      workflowId: workflowB.id
    });

    // Verify Outbox captured Campaign Creations
    const outboxRecords = await prisma.outboxQueue.findMany({ where: { status: 'PENDING' } });
    expect(outboxRecords.length).toBe(2);

    // 4) Submit Application to Campaign A
    const application = await applicationService.submitApplication({
      tenantId: tenant1,
      userId: 'parent-1',
    }, {
      campaignId: campaignA.id,
      studentFirstName: 'John',
      studentLastName: 'Doe',
      studentDateOfBirth: new Date('2015-05-15'),
      formVersion: 1,
      customFields: {},
    });

    // Assume the trigger sets it to first stage of the workflow. For this test, we can just update it manually or test workflow bounds
    await prisma.admissionApplication.update({
      where: { id: application.id },
      data: { currentStageId: stageA1.id }
    });

    // 5) Attempt to transition Application A using a stage from Workflow B (Should fail)
    await expect(
      workflowService.transitionApplication(
        { tenantId: tenant1, userId: 'admin-1' }, 
        application.id, 
        stageB2.id, // stage from Workflow B
        application.version
      )
    ).rejects.toThrow('Target stage not found');

    // 6) Transition Application A using a stage from Workflow A (Should succeed)
    const transitionRes = await workflowService.transitionApplication(
      { tenantId: tenant1, userId: 'admin-1' }, 
      application.id, 
      stageA2.id, 
      application.version
    );
    expect(transitionRes.currentStageId).toBe(stageA2.id);

    // Verify Outbox captured the transition
    const transitionEvents = await prisma.domainEventLog.findMany({ 
      where: { eventType: 'Admissions.Workflow.Transitioned' } 
    });
    expect(transitionEvents.length).toBe(1);
    expect(transitionEvents[0].tenantId).toBe(tenant1);

    // 7) Complete a Review
    const reviewRes = await reviewService.submitReview(
      { tenantId: tenant1, userId: 'reviewer-1' },
      application.id,
      stageA2.id,
      {
        score: 95,
        recommendation: 'APPROVE',
        comments: 'Excellent candidate'
      }
    );
    expect(reviewRes.score).toBe(95);

    // 8) Final Enrollment Decision
    await applicationService.triggerEnrollment(
      { tenantId: tenant1, userId: 'admin-1' },
      application.id
    );

    // Dispatch Pending Outbox events
    const dispatched = await eventDispatcher.dispatchPending();
    expect(dispatched).toBeGreaterThan(0);

    const enrollmentEvents = await prisma.domainEventLog.findMany({
      where: { eventType: 'Admissions.Application.Enrolled' }
    });
    expect(enrollmentEvents.length).toBe(1);
    expect(enrollmentEvents[0].tenantId).toBe(tenant1);
  });

  it('2. Tenant Isolation Verification', async () => {
    // Attempt to mutate Tenant 1's campaign using Tenant 2 context
    const academicYear = await prisma.academicYear.create({
      data: {
        id: 'ay-iso-1',
        tenantId: tenant1,
        name: 'ISO-2027',
        startDate: new Date(),
        endDate: new Date(),
        status: 'ACTIVE'
      }
    });

    const campaign = await campaignService.createCampaign({
      tenantId: tenant1,
      userId: 'admin-1',
    }, {
      name: 'Tenant 1 Campaign',
      academicYearId: academicYear.id,
      startDate: new Date('2027-01-01'),
      endDate: new Date('2027-12-31'),
    });

    // Tenant 2 tries to activate Tenant 1's campaign
    await expect(
      campaignService.activateCampaign({ tenantId: tenant2, userId: 'admin-2' } as any, campaign.id)
    ).rejects.toThrow(); // Should fail
  });
});
