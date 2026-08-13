import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { IdentityModule } from '../../identity/identity.module';
import { RedisCacheModule } from '../../../platform-services/redis/redis.module';
import { Cache } from 'cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaClient } from '@saas/core-platform';

import { WebsiteModule } from '../website.module';
import { PageService } from '../services/page.service';
import { WebsiteService } from '../services/website.service';
import { DatabaseModule } from '../../../database/database.module';
import { PrismaService } from '../../../database/prisma.service';
import { EventDispatcher, IdempotencyService, DomainEventPublisher, EventEmitterPublisher } from '@saas/core-platform';

describe('Website & Outbox Integration (Real E2E)', () => {
  jest.setTimeout(60000); // Increase timeout for real DB and DI compilation
  let app: INestApplication;
  let prisma: PrismaClient;
  let cacheManager: Cache;
  let pageService: PageService;
  let websiteService: WebsiteService;
  let eventDispatcher: EventDispatcher;
  let idempotencyService: IdempotencyService;

  const tenant1 = 'e2e-tenant-1';
  const tenant2 = 'e2e-tenant-2';

  beforeAll(async () => {
    // 1. Compile Module FIRST
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        RedisCacheModule,
        EventEmitterModule.forRoot(),
        IdentityModule,
        WebsiteModule,
      ],
      providers: [
        {
          provide: PrismaClient,
          useExisting: PrismaService,
        },
        {
          provide: DomainEventPublisher,
          useClass: EventEmitterPublisher,
        },
        EventDispatcher,
        IdempotencyService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaClient);

    cacheManager = app.get<Cache>(CACHE_MANAGER);
    pageService = app.get(PageService);
    websiteService = app.get(WebsiteService);
    eventDispatcher = app.get(EventDispatcher);
    idempotencyService = app.get(IdempotencyService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let planId: string;

  beforeEach(async () => {
    await cacheManager.clear();
    
    // Clean up E2E tables
    await prisma.outboxQueue.deleteMany({});
    await prisma.domainEventLog.deleteMany({});
    await prisma.idempotencyRecord.deleteMany({});
    await prisma.page.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await prisma.websiteDomain.deleteMany({ where: { website: { tenantId: { in: [tenant1, tenant2] } } } });
    await prisma.website.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    
    // Clean up Tenants and Plan from previous failed runs if any
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    await prisma.platformPlan.deleteMany({ where: { name: 'E2E Test Plan' } });

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
        { id: tenant1, name: 'E2E Tenant 1', slug: 'e2e-tenant-1', planId },
        { id: tenant2, name: 'E2E Tenant 2', slug: 'e2e-tenant-2', planId },
      ]
    });
  });

  it('1. Publishing Lifecycle E2E: Real DB Mutation -> Outbox -> Dispatcher -> Cache', async () => {
    // A) Create Tenant Website
    const website = await prisma.website.create({
      data: {
        id: 'website-1',
        tenantId: tenant1,
        themeColors: {},
        heroConfig: {},
        seoMeta: {},
        domain: 'e2e-school.com',
        domains: {
          create: { domainName: 'e2e-school.com' }
        }
      }
    });

    // B) Create Page
    const page = await prisma.page.create({
      data: {
        id: 'page-1',
        tenantId: tenant1,
        websiteId: 'website-1',
        slug: 'home',
        title: 'Home Page',
        contentBlocks: [],
        isPublished: false,
        version: 1
      }
    });

    // Seed cache (to verify invalidation)
    await cacheManager.set(`website:resolve:e2e-school.com:home`, { cached: 'old-content' });
    expect(await cacheManager.get(`website:resolve:e2e-school.com:home`)).toBeDefined();

    // C) Publish Page (Transactional Outbox)
    await pageService.publishPage(tenant1, page.id);

    // Verify DB Mutation
    const publishedPage = await prisma.page.findUnique({ where: { id: page.id } });
    expect(publishedPage?.isPublished).toBe(true);

    // Verify Outbox Records
    const eventLogs = await prisma.domainEventLog.findMany();
    expect(eventLogs.length).toBe(1);
    expect(eventLogs[0].eventType).toBe('Website.PagePublished');
    expect(eventLogs[0].tenantId).toBe(tenant1);

    const outboxQueue = await prisma.outboxQueue.findMany();
    expect(outboxQueue.length).toBe(1);
    expect(outboxQueue[0].status).toBe('PENDING');

    // D) Run Dispatcher
    const processedCount = await eventDispatcher.dispatchPending();
    expect(processedCount).toBe(1);

    // Verify Outbox Status
    const completedQueue = await prisma.outboxQueue.findFirst({ where: { id: outboxQueue[0].id } });
    expect(completedQueue?.status).toBe('COMPLETED');

    // Verify Cache Invalidation (Event listener hit)
    // Wait briefly for async event to process
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const cacheHit = await cacheManager.get(`website:resolve:e2e-school.com:home`);
    expect(cacheHit).toBeUndefined(); // Should be invalidated

    await idempotencyService.withIdempotency(prisma, 'cache-invalidator', eventLogs[0].eventId, async (tx) => {
       // do work
    });
    
    // Attempting same idempotency block should gracefully skip
    let executedSecondTime = false;
    await idempotencyService.withIdempotency(prisma, 'cache-invalidator', eventLogs[0].eventId, async (tx) => {
       executedSecondTime = true;
    });
    expect(executedSecondTime).toBe(false);

    // Verify Public API picks up new content
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/website/resolve?domain=e2e-school.com&path=home');
    
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Home Page');
  });

  it('2. Tenant Isolation Verification', async () => {
    // Attempt to publish a page belonging to tenant1 using tenant2 context
    const website = await prisma.website.create({
      data: {
        id: 'website-1',
        tenantId: tenant1,
        themeColors: {},
        heroConfig: {},
        seoMeta: {},
        domain: 'e2e-school.com',
      }
    });

    const page = await prisma.page.create({
      data: {
        id: 'page-2',
        tenantId: tenant1,
        websiteId: website.id,
        slug: 'about',
        title: 'About',
        contentBlocks: [],
        isPublished: false,
        version: 1
      }
    });

    await expect(pageService.publishPage(tenant2, page.id)).rejects.toThrow('Page not found');

    // Outbox should be empty
    const outboxCount = await prisma.outboxQueue.count();
    expect(outboxCount).toBe(0);
  });

  it('3. Failure & Retry Quarantine Behavior', async () => {
    // Create an artificial Outbox record that will fail due to a bad payload
    await prisma.outboxQueue.create({
      data: {
        eventId: 'bad-event',
        aggregateId: 'fake-agg',
        status: 'PENDING',
        tenantId: tenant1,
        attempts: 4, // 4 attempts means the next failure pushes it to 5 (QUARANTINED)
      }
    });

    const processedCount = await eventDispatcher.dispatchPending();
    expect(processedCount).toBe(0); // It fails, so it doesn't count as processed

    const queueRecord = await prisma.outboxQueue.findUnique({ where: { eventId: 'bad-event' } });
    expect(queueRecord?.status).toBe('QUARANTINED');
    expect(queueRecord?.attempts).toBe(5);
    expect(queueRecord?.errorMessage).toContain('DomainEventLog not found');
  });
});
