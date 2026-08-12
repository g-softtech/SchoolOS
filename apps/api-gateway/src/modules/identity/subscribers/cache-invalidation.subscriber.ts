import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { CacheProvider } from '@saas/core-platform';

@Injectable()
export class CacheInvalidationSubscriber {
  constructor(@Inject('CACHE_PROVIDER') private readonly cache: CacheProvider) {}

  @OnEvent('Identity.Role.Updated')
  async handleRoleUpdated(event: any) {
    const { roleId, tenantId } = event.payload;
    if (roleId && tenantId) {
      const cacheKey = `rbac:role:${roleId}:tenant:${tenantId}`;
      await this.cache.delete(cacheKey);
      console.log(`[Cache Invalidation] Cleared Redis key: ${cacheKey}`);
    }
  }
}
