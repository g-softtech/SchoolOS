import { Injectable, NotFoundException } from '@nestjs/common';
import { WebsiteRepository } from '../repositories/website.repository';
import { PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class WebsiteService {
  constructor(
    private readonly websiteRepo: WebsiteRepository,
    private readonly eventBus: PlatformEventBus
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

      await this.eventBus.publish({
        eventName: 'Website.Updated',
        version: 1,
        occurredAt: new Date().toISOString(),
        payload: { tenantId, fields: Object.keys(updates) }
      });

      if (updates.themeId && updates.themeId !== website.themeId) {
        await this.eventBus.publish({
          eventName: 'Website.ThemeChanged',
          version: 1,
          occurredAt: new Date().toISOString(),
          payload: { tenantId, themeId: updates.themeId }
        });
      }

      return updated;
    });
  }
}
