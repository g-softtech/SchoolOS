import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PolicyContext, AuthorizationException } from '@saas/core-platform';

export interface PolicyHandler {
  evaluate(context: PolicyContext, rules: any): Promise<{ allowed: boolean; reason?: string }>;
}

@Injectable()
export class PolicyRegistry {
  private readonly handlers = new Map<string, PolicyHandler>();

  register(policyName: string, handler: PolicyHandler) {
    this.handlers.set(policyName, handler);
  }

  getHandler(policyName: string): PolicyHandler | undefined {
    return this.handlers.get(policyName);
  }
}

@Injectable()
export class PolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PolicyRegistry,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async evaluate(policyName: string, context: PolicyContext): Promise<boolean> {
    const handler = this.registry.getHandler(policyName);
    
    // STRICT DEFAULT-DENY: Anything not explicitly allowed is denied.
    if (!handler) {
      this.audit(context, policyName, false, 'NO_HANDLER', 'Handler not registered');
      throw new AuthorizationException('POLICY_REJECTED', `Policy handler [${policyName}] not found.`);
    }

    const cacheKey = `policy:${policyName}:${context.tenantId}:${context.userId}:${JSON.stringify(context.resource || {})}`;
    const cachedResult = await this.cacheManager.get<{ allowed: boolean; reason?: string; version?: string }>(cacheKey);

    if (cachedResult) {
      if (!cachedResult.allowed) {
        this.audit(context, policyName, false, cachedResult.version, cachedResult.reason);
        throw new AuthorizationException('POLICY_REJECTED', cachedResult.reason || 'Denied by policy', cachedResult.version);
      }
      this.audit(context, policyName, true, cachedResult.version);
      return true;
    }

    // Fetch active policy version
    const policy = await this.prisma.policy.findUnique({
      where: { tenantId_name: { tenantId: context.tenantId, name: policyName } },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    });

    // STRICT DEFAULT-DENY: If no policy configured for tenant, DENY
    if (!policy || !policy.isActive || policy.versions.length === 0) {
      this.audit(context, policyName, false, 'UNCONFIGURED', 'Policy not configured or inactive');
      throw new AuthorizationException('POLICY_REJECTED', `Policy [${policyName}] is not configured for tenant.`);
    }

    const activeVersion = policy.versions[0];
    const rules = activeVersion.rules;
    const versionStr = `v${activeVersion.versionNumber}`;

    const start = performance.now();
    const result = await handler.evaluate(context, rules);
    const duration = performance.now() - start;

    await this.cacheManager.set(cacheKey, { ...result, version: versionStr }, 300 * 1000);

    if (!result.allowed) {
      this.audit(context, policyName, false, versionStr, result.reason);
      throw new AuthorizationException('POLICY_REJECTED', result.reason || 'Denied by policy', versionStr);
    }

    this.audit(context, policyName, true, versionStr);
    return true;
  }

  private audit(context: PolicyContext, policyName: string, allowed: boolean, version?: string, reason?: string) {
    const eventName = allowed ? 'AUTHZ_SUCCESS' : 'AUTHZ_FAILED';
    this.eventEmitter.emit(eventName, {
      tenantId: context.tenantId,
      userId: context.userId,
      policyName,
      policyVersion: version,
      allowed,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}
