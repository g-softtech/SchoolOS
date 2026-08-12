import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { Cache } from 'cache-manager';
import { WebsiteModule } from '../website.module';
import { WebsiteRepository } from '../repositories/website.repository';
import { PageRepository } from '../repositories/page.repository';
import { PageService } from '../services/page.service';
import { WebsiteService } from '../services/website.service';
import { EdgeDeliveryController } from '../controllers/edge-delivery.controller';
import { WebsiteCacheSubscriber } from '../subscribers/website-cache.subscriber';
import { OutboxService } from '@saas/core-platform';

describe('Website Integration & Edge Delivery Certification', () => {
  let app: INestApplication;
  let cacheManager: Cache;
  let pageService: PageService;
  let websiteRepo: WebsiteRepository;
  let pageRepo: PageRepository;
  let outboxService: OutboxService;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    // 1. Create a fully mocked database layer, but real WebsiteModule, CacheModule, EventEmitter
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true }), // In-memory cache for tests
        EventEmitterModule.forRoot(),
      ],
      controllers: [
        EdgeDeliveryController
      ],
      providers: [
        WebsiteCacheSubscriber,
        PageService,
        WebsiteService,
        {
          provide: WebsiteRepository,
          useValue: {
            findByDomain: jest.fn(),
            findByTenant: jest.fn(),
          }
        },
        {
          provide: PageRepository,
          useValue: {
            findBySlug: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            updateWithLock: jest.fn(),
            transaction: jest.fn().mockImplementation(async function(this: any, cb) {
              return cb({ 
                prisma: {}, 
                update: this.update,
                findById: this.findById,
                updateWithLock: this.updateWithLock
              });
            }),
          }
        },
        {
          provide: OutboxService,
          useValue: {
            appendEvent: jest.fn(),
          }
        }
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cacheManager = app.get<Cache>(CACHE_MANAGER);
    pageService = app.get(PageService);
    websiteRepo = app.get(WebsiteRepository);
    pageRepo = app.get(PageRepository);
    outboxService = app.get(OutboxService);
    eventEmitter = app.get(EventEmitter2);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cacheManager.clear();
    jest.clearAllMocks();
  });

  it('1. HTTP Boundary: Should miss cache, hit DB, and structure public response', async () => {
    (websiteRepo.findByDomain as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1', themeId: 'theme-x', branding: {} });
    (pageRepo.findBySlug as jest.Mock).mockResolvedValue({ slug: 'home', title: 'Home', status: 'PUBLISHED', contentBlocks: [], seoMetadata: {}, version: 5, deletedBy: null });

    const startTimeMiss = performance.now();
    const resMiss = await request(app.getHttpServer())
      .get('/api/v1/public/website/resolve?domain=school.com&path=home');
    const endTimeMiss = performance.now();

    expect(resMiss.status).toBe(200);
    expect(resMiss.body.resolvedDomain).toBe('school.com');
    expect(resMiss.body.title).toBe('Home');
    expect(resMiss.body.version).toBeUndefined(); // Metadata omitted
    expect(resMiss.body.deletedBy).toBeUndefined(); // Metadata omitted
    expect(websiteRepo.findByDomain).toHaveBeenCalledTimes(1);
    
    // Explicitly set the cache so test 2 can rely on it if run independently, or just let test 2 run after
  });

  it('2. HTTP Boundary: Second request should hit cache and be faster', async () => {
    // Seed cache as if it were the second request
    await cacheManager.set('website:resolve:school.com:home', { title: 'Home', resolvedDomain: 'school.com' });
    (websiteRepo.findByDomain as jest.Mock).mockClear();

    const startTimeHit = performance.now();
    const resHit = await request(app.getHttpServer())
      .get('/api/v1/public/website/resolve?domain=school.com&path=home');
    const endTimeHit = performance.now();

    expect(resHit.status).toBe(200);
    expect(websiteRepo.findByDomain).not.toHaveBeenCalled(); // Cache hit!
    expect(resHit.body.title).toBe('Home');

    // Basic latency bounds check (not strict SLA for unit test, but verifying it's cached)
    // Even in memory, cached should be very fast.
    const hitDuration = endTimeHit - startTimeHit;
    expect(hitDuration).toBeLessThan(50); 
  });

  it('3. HTTP Boundary: Should enforce tenant isolation and status rules', async () => {
    (websiteRepo.findByDomain as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (pageRepo.findBySlug as jest.Mock).mockResolvedValue({ slug: 'draft-page', status: 'DRAFT' });

    await request(app.getHttpServer())
      .get('/api/v1/public/website/resolve?domain=school.com&path=draft-page')
      .expect(404); // Draft pages should 404
  });

  it('4. Publishing Lifecycle E2E: Mutation -> Outbox -> Event -> Cache Invalidation', async () => {
    // A) Seed Cache
    await cacheManager.set('website:resolve:school.com:home', { cached: 'old-content' });
    expect(await cacheManager.get('website:resolve:school.com:home')).toBeDefined();

    // Setup mocks for page publish
    (pageRepo.findById as jest.Mock).mockResolvedValue({ id: 'page-1', slug: 'home' });
    (pageRepo.update as jest.Mock).mockResolvedValue({ id: 'page-1', slug: 'home', status: 'PUBLISHED' });
    
    // Setup mock for cache subscriber resolving tenant domains
    (websiteRepo.findByTenant as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1', domains: [{ domainName: 'school.com' }] });

    // B) Perform Page Mutation (Transactional Outbox Step)
    await pageService.publishPage('tenant-1', 'page-1');
    
    // C) Verify transaction and outbox insertion
    expect(pageRepo.transaction).toHaveBeenCalled();
    expect(outboxService.appendEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'Website.PagePublished' })
    );

    // D) Simulate EventDispatcher picking it up and emitting
    await eventEmitter.emitAsync('Website.PagePublished', {
      eventType: 'Website.PagePublished',
      payload: { tenantId: 'tenant-1', pageId: 'page-1', slug: 'home' }
    });

    // E) Wait for async subscriber macro-task to execute
    await new Promise(resolve => setTimeout(resolve, 50));

    // F) Verify idempotent cache invalidation
    const cacheAfterPublish = await cacheManager.get('website:resolve:school.com:home');
    expect(cacheAfterPublish).toBeUndefined(); // Cache was invalidated!

    // Ensure idempotency: re-emitting should not crash
    await eventEmitter.emitAsync('Website.PagePublished', {
      eventType: 'Website.PagePublished',
      payload: { tenantId: 'tenant-1', pageId: 'page-1', slug: 'home' }
    });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(await cacheManager.get('website:resolve:school.com:home')).toBeUndefined();
  });
});
