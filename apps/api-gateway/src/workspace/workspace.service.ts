import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getCacheKey(userId: string, tenantId: string) {
    return `workspace:context:${userId}:${tenantId}`;
  }

  async resolveWorkspace(userId: string, requestedTenantId?: string): Promise<any> {
    const start = performance.now();
    let hitRate = 0;

    // 1. Determine target tenant
    let targetTenantId = requestedTenantId;
    if (!targetTenantId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { preferredTenantId: true } });
      if (user?.preferredTenantId) {
        targetTenantId = user.preferredTenantId;
      } else {
        // Find first membership if no preference
        const membership = await this.prisma.tenantMembership.findFirst({ where: { userId } });
        if (!membership) {
          throw new NotFoundException('No workspace memberships found.');
        }
        targetTenantId = membership.tenantId;
      }
    }

    // 2. Check Cache
    const cacheKey = this.getCacheKey(userId, targetTenantId);
    const cachedContext = await this.cacheManager.get(cacheKey);

    if (cachedContext) {
      hitRate = 1;
      this.recordMetrics(performance.now() - start, hitRate, JSON.stringify(cachedContext).length);
      return cachedContext;
    }

    // 3. Rebuild Context from DB
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: targetTenantId, userId } },
      include: {
        tenant: {
          include: {
            settings: true,
            branding: true,
            subscriptions: { where: { status: 'ACTIVE' } },
            marketplaceApps: { include: { app: true } },
            featureFlags: true,
            AcademicYear: { where: { status: 'ACTIVE' }, include: { terms: true } },
          }
        },
        role: {
          include: { permissions: { include: { permission: true } } }
        }
      }
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found or access denied.');
    }

    const { tenant, role } = membership;
    const currentAcademicSession = tenant.AcademicYear?.[0] || null;
    const currentTerm = currentAcademicSession?.terms?.[0] || null;

    const context = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        theme: tenant.branding,
        timezone: tenant.settings?.timezone || 'UTC',
        currency: tenant.settings?.currency || 'USD',
      },
      user: {
        id: userId,
        role: role.name,
        permissions: role.permissions.reduce((acc, rp) => {
          acc[rp.permission.name] = true;
          return acc;
        }, {} as Record<string, boolean>),
      },
      academic: {
        sessionId: currentAcademicSession?.id,
        sessionName: currentAcademicSession?.name,
        termId: currentTerm?.id,
        termName: currentTerm?.name,
      },
      subscription: tenant.subscriptions?.[0] || null,
      marketplaceApps: tenant.marketplaceApps.map(ma => ma.app.appCode),
      featureFlags: tenant.featureFlags.reduce((acc, flag) => {
        acc[flag.feature] = flag.enabled;
        return acc;
      }, {} as Record<string, boolean>),
      version: 1, // Will be incremented on invalidation
      resolvedAt: new Date().toISOString(),
    };

    // Store in cache (TTL: 1 hour)
    await this.cacheManager.set(cacheKey, context, 3600 * 1000);

    // Update Recent Schools implicitly by setting preferredTenantId
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredTenantId: tenant.id }
    });

    this.eventEmitter.emit('TenantSelectedEvent', { userId, tenantId: tenant.id });

    this.recordMetrics(performance.now() - start, hitRate, JSON.stringify(context).length);
    return context;
  }

  async invalidateWorkspace(userId: string, tenantId: string) {
    const cacheKey = this.getCacheKey(userId, tenantId);
    await this.cacheManager.del(cacheKey);
  }

  async getRecentSchools(userId: string) {
    // Fetches top memberships. A real implementation might use a dedicated RecentWorkspaces table or Redis list.
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { userId },
      include: { tenant: { include: { branding: true } } },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });
    return memberships.map(m => m.tenant);
  }

  async getStatus() {
    return {
      status: 'healthy',
      redis: 'healthy',
      cacheVersion: 1,
      timestamp: new Date().toISOString(),
    };
  }

  private recordMetrics(resolutionTimeMs: number, hitRate: number, contextSizeBytes: number) {
    this.eventEmitter.emit('Analytics.Track', {
      event: 'WorkspaceResolutionMetrics',
      properties: { resolutionTimeMs, hitRate, contextSizeBytes }
    });
  }
}
