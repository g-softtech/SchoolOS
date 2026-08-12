import { Injectable, NotFoundException } from '@nestjs/common';
import { PageRepository } from '../repositories/page.repository';
import { WebsiteRepository } from '../repositories/website.repository';
import { OutboxService } from '@saas/core-platform';

@Injectable()
export class PageService {
  constructor(
    private readonly pageRepo: PageRepository,
    private readonly websiteRepo: WebsiteRepository,
    private readonly outboxService: OutboxService
  ) {}

  async createPage(tenantId: string, data: any) {
    const website = await this.websiteRepo.findByTenant(tenantId);
    if (!website) throw new NotFoundException('Website not found');

    return this.pageRepo.transaction(async (repo) => {
      const page = await repo.create({
        data: {
          tenantId,
          websiteId: website.id,
          title: data.title,
          slug: data.slug,
          contentBlocks: [],
        }
      });

      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Website.PageCreated',
        aggregateId: page.id,
        aggregateType: 'Page',
        tenantId,
        version: 1,
        payload: { tenantId, pageId: page.id }
      });

      return page;
    });
  }

  async updatePage(tenantId: string, id: string, currentVersion: number, updates: any) {
    return this.pageRepo.transaction(async (repo) => {
      // Uses the optimistic lock wrapper
      const updated = await repo.updateWithLock(id, tenantId, currentVersion, updates);

      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Website.PageUpdated',
        aggregateId: id,
        aggregateType: 'Page',
        tenantId,
        version: 1,
        payload: { tenantId, pageId: id }
      });

      return updated;
    });
  }

  async publishPage(tenantId: string, id: string) {
    const page = await this.pageRepo.findById(id, tenantId);
    if (!page) throw new NotFoundException('Page not found');

    return this.pageRepo.transaction(async (repo) => {
      const updated = await repo.update(id, tenantId, { isPublished: true });

      // Critical Event: Triggers Edge Cache Invalidation & Search Indexing
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Website.PagePublished',
        aggregateId: id,
        aggregateType: 'Page',
        tenantId,
        version: 1,
        payload: { tenantId, pageId: id, slug: updated.slug }
      });

      return updated;
    });
  }

  async archivePage(tenantId: string, id: string) {
    return this.pageRepo.transaction(async (repo) => {
      const updated = await repo.update(id, tenantId, { isPublished: false });

      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Website.PageArchived',
        aggregateId: id,
        aggregateType: 'Page',
        tenantId,
        version: 1,
        payload: { tenantId, pageId: id }
      });

      return updated;
    });
  }
}
