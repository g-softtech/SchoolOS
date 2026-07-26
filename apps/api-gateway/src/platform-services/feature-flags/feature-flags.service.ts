import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
  ) {}

  /**
   * Check if a feature is enabled for a specific tenant.
   */
  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    const cacheKey = `tenant:${tenantId}:feature:${feature}`;
    const cachedFlag = await this.cacheManager.get<boolean>(cacheKey);

    if (cachedFlag !== undefined && cachedFlag !== null) {
      return cachedFlag;
    }

    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        tenantId_feature: { tenantId, feature },
      },
    });

    const isEnabled = flag?.enabled ?? false;

    // Cache the boolean result
    await this.cacheManager.set(cacheKey, isEnabled, 60 * 60 * 1000); // 1 hour

    return isEnabled;
  }

  /**
   * Enable or disable a feature flag.
   */
  async setFeatureFlag(tenantId: string, feature: string, enabled: boolean): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: {
        tenantId_feature: { tenantId, feature },
      },
      update: { enabled },
      create: { tenantId, feature, enabled },
    });

    const cacheKey = `tenant:${tenantId}:feature:${feature}`;
    await this.cacheManager.set(cacheKey, enabled, 60 * 60 * 1000);
  }
}
