import { Injectable, NotFoundException } from '@nestjs/common';
import { NavigationRepository } from '../repositories/navigation.repository';
import { OutboxService } from '@saas/core-platform';

@Injectable()
export class NavigationService {
  constructor(
    private readonly navRepo: NavigationRepository,
    private readonly outboxService: OutboxService
  ) {}

  async getMenu(tenantId: string, location: string, locale: string = 'en') {
    return this.navRepo.findByLocation(tenantId, location, locale);
  }

  async updateMenu(tenantId: string, menuId: string, items: any[]) {
    return this.navRepo.transaction(async (repo) => {
      // In a real implementation, this would map the nested items DTO to the NavigationItem creations.
      // For now, we simulate the top-level event.
      
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Website.NavigationUpdated',
        aggregateId: menuId,
        aggregateType: 'NavigationMenu',
        tenantId,
        version: 1,
        payload: { tenantId, menuId }
      });

      return { success: true };
    });
  }
}
