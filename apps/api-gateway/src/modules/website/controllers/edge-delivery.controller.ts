import { Controller, Get, Query, Inject, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { WebsiteRepository } from '../repositories/website.repository';
import { PageRepository } from '../repositories/page.repository';

@ApiTags('Public Edge Delivery')
@Controller('api/v1/public/website/resolve')
export class EdgeDeliveryController {
  
  // NOTE: This controller specifically does NOT use PoliciesGuard or AuthGuard.
  // It relies on Redis edge-caching for `<50ms` latency and falls back to a query.
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly websiteRepo: WebsiteRepository,
    private readonly pageRepo: PageRepository
  ) {}

  @Get()
  @ApiOperation({ summary: 'Resolve domain/path to a public JSON page payload' })
  async resolvePath(@Query('domain') domain: string, @Query('path') path: string) {
    const cacheKey = `website:resolve:${domain}:${path}`;

    // Attempt cache hit
    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Cache miss - fallback to DB
    // 1. Validate custom domain mappings (bypasses standard tenant resolution)
    const website = await this.websiteRepo.findByDomain(domain);
    if (!website) {
      throw new NotFoundException('Domain not mapped to any active website');
    }

    const tenantId = website.tenantId;

    // 2. Query Page where status=PUBLISHED
    // 'path' is expected to be the slug (e.g. 'home' or 'about-us')
    const page = await this.pageRepo.findBySlug(tenantId, path);
    if (!page || !page.isPublished) {
      throw new NotFoundException('Page not found or not published');
    }

    // 3. Omit metadata (deletedBy, version) to enforce public boundary
    const response = {
      resolvedDomain: domain,
      path: page.slug,
      title: page.title,
      contentBlocks: page.contentBlocks,
      seoMeta: website.seoMeta,
      // Provide theme details from website setting
      themeColors: website.themeColors,
      heroConfig: website.heroConfig
    };

    // Cache for future requests
    await this.cacheManager.set(cacheKey, response);

    return response;
  }
}
