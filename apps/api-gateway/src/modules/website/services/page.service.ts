import { Injectable, NotFoundException } from '@nestjs/common';
import { PageRepository } from '../repositories/page.repository';
import { WebsiteRepository } from '../repositories/website.repository';
import { PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class PageService {
  constructor(
    private readonly pageRepo: PageRepository,
    private readonly websiteRepo: WebsiteRepository,
    private readonly eventBus: PlatformEventBus
  ) {}

  async createPage(tenantId: string, data: any) {
    const website = await this.websiteRepo.findByTenant(tenantId);
    if (!website) throw new NotFoundException('Website not found');

    const page = await this.pageRepo.create({
      data: {
        tenantId,
        websiteId: website.id,
        title: data.title,
        slug: data.slug,
        contentBlocks: [],
      }
    });

    await this.eventBus.publish({
      eventName: 'Website.PageCreated',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { tenantId, pageId: page.id }
    });

    return page;
  }

  async updatePage(tenantId: string, id: string, currentVersion: number, updates: any) {
    // Uses the optimistic lock wrapper
    const updated = await this.pageRepo.updateWithLock(id, tenantId, currentVersion, updates);

    await this.eventBus.publish({
      eventName: 'Website.PageUpdated',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { tenantId, pageId: id }
    });

    return updated;
  }

  async publishPage(tenantId: string, id: string) {
    const page = await this.pageRepo.findById(id, tenantId);
    if (!page) throw new NotFoundException('Page not found');

    const updated = await this.pageRepo.update(id, tenantId, { status: 'PUBLISHED' });

    // Critical Event: Triggers Edge Cache Invalidation & Search Indexing
    await this.eventBus.publish({
      eventName: 'Website.PagePublished',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { tenantId, pageId: id, slug: updated.slug }
    });

    return updated;
  }

  async archivePage(tenantId: string, id: string) {
    const updated = await this.pageRepo.update(id, tenantId, { status: 'ARCHIVED' });

    await this.eventBus.publish({
      eventName: 'Website.PageArchived',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { tenantId, pageId: id }
    });

    return updated;
  }
}
