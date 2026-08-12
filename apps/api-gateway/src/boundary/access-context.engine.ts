import { Injectable } from '@nestjs/common';
import { AccessContext, AccessDecision } from '@saas/core-platform';
import { PolicyService } from '../policy/policy.service';

@Injectable()
export class AccessContextEngine {
  constructor(private readonly policyService: PolicyService) {}

  /**
   * The primary entrypoint for the two-stage policy pipeline.
   * Runs Pre-Authorization Boundary -> Authorization -> Post-Authorization Boundary.
   */
  async evaluate(context: AccessContext, policyName: string): Promise<AccessDecision> {
    const decision: AccessDecision = {
      authenticated: !!context.user,
      authorized: false,
      boundaryAllowed: false,
      decision: 'DENY',
      trustScore: context.credential?.trustScore ?? 0,
      riskScore: 0,
      correlationId: undefined, // Usually attached by a broader request interceptor/filter
      explanation: [],
      requiredActions: []
    };

    // 1. Pre-Authorization Boundary (Global Checks)
    const preAuthResult = this.evaluatePreAuthBoundary(context, decision);
    if (!preAuthResult.allowed) {
      decision.decision = 'DENY';
      return decision;
    }

    // 2. Authorization (RBAC, Policy, Capability)
    let authorized = false;
    let policyVersion = undefined;
    try {
      // Adapting PolicyService context to the broader AccessContext
      const policyCtx = {
        tenantId: context.tenant?.id || 'unknown',
        userId: context.user?.id || 'unknown',
        resource: context.resource
      };
      
      const authzResult = await this.policyService.evaluate(policyName, policyCtx);
      authorized = authzResult; // If no throw, allowed
      decision.authorized = true;
    } catch (error: any) {
      decision.authorized = false;
      decision.decision = 'DENY';
      decision.explanation.push(error.reason || error.message || 'Authorization failed');
      decision.policyVersion = error.policyVersion;
      decision.capabilityVersion = error.capabilityVersion;
      return decision;
    }

    // 3. Post-Authorization Boundary (Resource/Capability Specific Checks)
    const postAuthResult = this.evaluatePostAuthBoundary(context, decision, policyName);
    
    if (postAuthResult.stepUpRequired) {
      decision.decision = 'STEP_UP_AUTH';
      decision.boundaryAllowed = false;
      decision.requiredActions.push(...postAuthResult.actions);
      decision.explanation.push(...postAuthResult.reasons);
      return decision;
    }

    if (!postAuthResult.allowed) {
      decision.decision = 'DENY';
      decision.boundaryAllowed = false;
      decision.explanation.push(...postAuthResult.reasons);
      return decision;
    }

    // Final Success
    decision.boundaryAllowed = true;
    decision.decision = 'ALLOW';
    return decision;
  }

  private evaluatePreAuthBoundary(context: AccessContext, decision: AccessDecision): { allowed: boolean } {
    let allowed = true;

    if (!context.user) {
      decision.explanation.push('Unauthenticated request');
      return { allowed: false };
    }

    if (context.session?.isRevoked) {
      decision.explanation.push('Session revoked');
      allowed = false;
    }

    if (context.device?.isRevoked) {
      decision.explanation.push('Device revoked');
      allowed = false;
    }

    // IP Blacklist (simulated static check for testability)
    if (context.ip === '192.168.1.99') { // Simulated blocked IP
      decision.explanation.push('IP address is blocked');
      allowed = false;
    }

    // Impossible travel (Geo anomaly + low trust)
    if (context.geo?.country === 'UNKNOWN' && decision.trustScore === 0) {
      decision.riskScore += 90;
      decision.explanation.push('Impossible travel detected with zero trust');
      allowed = false;
    }

    return { allowed };
  }

  private evaluatePostAuthBoundary(context: AccessContext, decision: AccessDecision, policyName: string): { allowed: boolean; stepUpRequired: boolean; actions: string[]; reasons: string[] } {
    const result = { allowed: true, stepUpRequired: false, actions: [] as string[], reasons: [] as string[] };

    // Example Resource-specific boundaries based on requested policy
    if (policyName === 'FINANCE_PAYROLL') {
      if (!context.device?.isManaged) {
        result.allowed = false;
        result.reasons.push('Payroll access requires a managed device');
      }
      
      // Step Up Auth
      if (!context.session?.mfaVerified) {
        result.stepUpRequired = true;
        result.actions.push('REQUIRE_MFA');
        result.reasons.push('Payroll access requires active MFA verification');
      }
    }

    if (policyName === 'EXAM_MODULE') {
      if (context.geo?.country !== 'NG') { // Example geographic restriction
        result.allowed = false;
        result.reasons.push('Exam module only accessible from approved campus regions');
      }
    }

    // Credential Trust Evaluation
    if (decision.trustScore < 50) {
      decision.riskScore += 40;
      if (policyName !== 'PUBLIC_READ') {
        result.allowed = false;
        result.reasons.push('Credential Trust Score is too low for this capability');
      }
    }

    return result;
  }
}
