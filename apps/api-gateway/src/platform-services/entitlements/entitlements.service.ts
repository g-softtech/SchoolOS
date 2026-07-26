import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
  ) {}

  /**
   * Retrieves the combined entitlements for a tenant (Plan + Add-ons)
   */
  async getTenantEntitlements(tenantId: string): Promise<any> {
    const cacheKey = `tenant:${tenantId}:entitlements`;
    const cachedEntitlements = await this.cacheManager.get(cacheKey);

    if (cachedEntitlements) {
      return cachedEntitlements;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const entitlements = tenant.plan.entitlements || {};
    
    // Future: merge with any active Add-on Subscriptions

    await this.cacheManager.set(cacheKey, entitlements, 60 * 60 * 1000); // 1 hour

    return entitlements;
  }

  /**
   * Checks if the tenant has not exceeded a specific limit (e.g., student_count)
   */
  async checkQuota(tenantId: string, quotaKey: string, currentUsage: number): Promise<boolean> {
    const entitlements = await this.getTenantEntitlements(tenantId);
    
    // If the quota key does not exist on the plan, it might be unlimited or blocked. 
    // Assuming if missing, there is no limit.
    if (entitlements[quotaKey] === undefined || entitlements[quotaKey] === null) {
      return true; // No limit
    }

    const limit = parseInt(entitlements[quotaKey], 10);
    return currentUsage < limit;
  }

  /**
   * Throws an exception if the quota is exceeded.
   */
  async enforceQuota(tenantId: string, quotaKey: string, currentUsage: number): Promise<void> {
    const isWithinQuota = await this.checkQuota(tenantId, quotaKey, currentUsage);
    if (!isWithinQuota) {
      throw new ForbiddenException(`Quota exceeded for ${quotaKey}. Please upgrade your plan.`);
    }
  }
}
