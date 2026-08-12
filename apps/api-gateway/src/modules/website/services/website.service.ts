import { Injectable, NotFoundException } from '@nestjs/common';
import { WebsiteRepository } from '../repositories/website.repository';
import { OutboxService } from '@saas/core-platform';

@Injectable()
export class WebsiteService {
  constructor(
    private readonly websiteRepo: WebsiteRepository,
    private readonly outboxService: OutboxService
  ) {}

  async getSettings(tenantId: string) {
    const website = await this.websiteRepo.findByTenant(tenantId);
    if (!website) {
      throw new NotFoundException('Website not found for tenant');
    }
    return website;
  }

  async updateSettings(tenantId: string, updates: any) {
    return this.websiteRepo.transaction(async (repo) => {
      const website = await repo.findByTenant(tenantId);
      if (!website) {
        throw new NotFoundException('Website not found');
      }

      const updated = await repo.update(website.id, tenantId, updates);

      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Website.Updated',
        aggregateId: website.id,
        aggregateType: 'Website',
        tenantId,
        version: 1,
        payload: { tenantId, fields: Object.keys(updates) }
      });

      if (updates.themeColors && updates.themeColors !== website.themeColors) {
        await this.outboxService.appendEvent(repo.prisma, {
          eventType: 'Website.ThemeChanged',
          aggregateId: website.id,
          aggregateType: 'Website',
          tenantId,
          version: 1,
          payload: { tenantId, themeColors: updates.themeColors }
        });
      }

      return updated;
    });
  }
}
