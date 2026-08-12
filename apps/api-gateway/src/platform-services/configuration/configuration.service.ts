import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConfigurationService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all settings for a tenant, utilizing Redis Cache.
   */
  async getTenantSettings(tenantId: string): Promise<any> {
    const cacheKey = `tenant:${tenantId}:settings`;
    const cachedSettings = await this.cacheManager.get(cacheKey);

    if (cachedSettings) {
      return cachedSettings;
    }

    // Retrieve from database if not cached
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (settings) {
      await this.cacheManager.set(cacheKey, settings, 60 * 60 * 1000); // 1 hour
    }

    return settings;
  }

  /**
   * Update settings and invalidate cache.
   */
  async updateTenantSettings(tenantId: string, data: any): Promise<any> {
    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        ...data,
      },
    });

    // Invalidate Cache
    await this.cacheManager.del(`tenant:${tenantId}:settings`);
    
    return settings;
  }
}
