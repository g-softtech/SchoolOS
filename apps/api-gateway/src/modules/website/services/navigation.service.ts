import { Injectable, NotFoundException } from '@nestjs/common';
import { NavigationRepository } from '../repositories/navigation.repository';
import { PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class NavigationService {
  constructor(
    private readonly navRepo: NavigationRepository,
    private readonly eventBus: PlatformEventBus
  ) {}

  async getMenu(tenantId: string, location: string, locale: string = 'en') {
    return this.navRepo.findByLocation(tenantId, location, locale);
  }

  async updateMenu(tenantId: string, menuId: string, items: any[]) {
    // In a real implementation, this would map the nested items DTO to the NavigationItem creations.
    // For now, we simulate the top-level event.
    
    await this.eventBus.publish({
      eventName: 'Website.NavigationUpdated',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { tenantId, menuId }
    });

    return { success: true };
  }
}
