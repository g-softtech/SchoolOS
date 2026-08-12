import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DomainEvent } from '@saas/core-platform';
import { WebsiteRepository } from '../repositories/website.repository';

@Injectable()
export class WebsiteCacheSubscriber {
  private readonly logger = new Logger(WebsiteCacheSubscriber.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly websiteRepo: WebsiteRepository
  ) {}

  @OnEvent('Website.PagePublished', { async: true })
  async handlePagePublished(event: DomainEvent) {
    try {
      const payload: any = event.payload;
      const { tenantId, slug } = payload;
      
      if (!tenantId || !slug) {
        this.logger.warn(`Invalid Website.PagePublished event payload: missing tenantId or slug`);
        return;
      }

      const website = await this.websiteRepo.findByTenant(tenantId);
      
      if (website && website.domains) {
        for (const domain of website.domains) {
          const cacheKey = `website:resolve:${domain.domainName}:${slug}`;
          await this.cacheManager.del(cacheKey);
          this.logger.debug(`Invalidated cache key: ${cacheKey}`);
        }
      }

      this.logger.log(`Successfully processed cache invalidation for PagePublished (Tenant: ${tenantId}, Slug: ${slug})`);
    } catch (error) {
      this.logger.error(`Error invalidating cache for Website.PagePublished`, error);
    }
  }

  @OnEvent('Website.ThemeChanged', { async: true })
  async handleThemeChanged(event: DomainEvent) {
    try {
      const payload: any = event.payload;
      const { tenantId } = payload;

      const website = await this.websiteRepo.findByTenant(tenantId);
      if (website && website.domains) {
        this.logger.log(`Theme changed for tenant ${tenantId}. Full cache invalidation required.`);
      }
    } catch (error) {
      this.logger.error(`Error invalidating cache for Website.ThemeChanged`, error);
    }
  }
}
