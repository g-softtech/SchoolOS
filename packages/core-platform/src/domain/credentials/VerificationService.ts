import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated/client';

export interface VerificationRequest {
  tenantId: string;
  token: string;
  deviceId: string;
  context: string; // 'ATTENDANCE', 'LIBRARY', 'EXAM'
}

export interface VerificationDecision {
  decision: 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';
  trustScore: number;
  reasons: string[];
  credentialStatus: string | null;
  ownerType: string | null;
  expiresIn: string | null;
  correlationId: string | null;
  
  // Lineage
  policyVersion?: number;
  capabilityProfileVersion?: number;
  keyVersion?: number;
  evaluatedAt: Date;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Evaluates Device Trust, Anti-Cloning Rules, Capability Profiles, and returns a nuanced decision.
   */
  async verify(req: VerificationRequest): Promise<VerificationDecision> {
    const reasons: string[] = [];
    let trustScore = 100;

    // 1. Evaluate Device Trust
    const device = await this.prisma.credentialDevice.findUnique({
      where: { id: req.deviceId }
    });

    if (!device || device.tenantId !== req.tenantId) {
      return this.deny(req, null, ['Device unknown.'], 0);
    }

    if (device.status === 'REVOKED' || device.status === 'QUARANTINED') {
      return this.deny(req, null, [`Device is ${device.status}.`], 0);
    }
    
    if (device.status === 'DEGRADED') {
      trustScore -= 30;
      reasons.push('Device is in DEGRADED state (e.g. clock drift).');
    }

    // 2. Decode Token & Find Active Version
    const version = await this.prisma.credentialVersion.findUnique({
      where: { token: req.token },
      include: { credential: true }
    });

    if (!version || version.status !== 'ACTIVE') {
      return this.deny(req, version?.credentialId, ['Token invalid or revoked.'], 0);
    }

    const credential = version.credential;

    if (credential.status !== 'ACTIVATED' && credential.status !== 'REPLACED') {
      return this.deny(req, credential.id, [`Credential is ${credential.status}.`], 0);
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      return this.deny(req, credential.id, [`Credential expired on ${credential.expiresAt.toISOString()}.`], 0);
    }

    // 3. Evaluate Capability Profile Context Rules
    const policy = await this.prisma.credentialPolicy.findFirst({
      where: {
        tenantId: req.tenantId,
        ownerType: credential.ownerType
      }
    });

    if (!policy) {
      return this.deny(req, credential.id, [`No policy found for ${credential.ownerType}.`], 0);
    }

    let capabilityProfile: Record<string, boolean> = {};
    let antiCloningRules: any = {};
    try {
      capabilityProfile = JSON.parse(policy.capabilityProfile);
      antiCloningRules = JSON.parse(policy.antiCloningRules);
    } catch (e) {
      this.logger.error('Failed to parse policy JSON');
    }

    const isAllowedInContext = capabilityProfile[req.context];

    if (!isAllowedInContext) {
      return this.deny(req, credential.id, [`Context DENIED by Capability Profile version ${policy.version}.`], 0, policy.version);
    }

    // 4. Evaluate Anti-Cloning Rules (Example: Simulataneous scans across locations)
    const recentScans = await this.prisma.verificationLog.findMany({
      where: {
        credentialId: credential.id,
        scannedAt: { gt: new Date(Date.now() - 60000) } // Last 60 seconds
      },
      orderBy: { scannedAt: 'desc' }
    });

    if (recentScans.length > 0) {
      const lastScan = recentScans[0];
      // If scanned on a different device within 60s
      if (lastScan.deviceId !== req.deviceId) {
        trustScore -= 60;
        reasons.push('Anti-Cloning Alert: Credential scanned on multiple devices within 60 seconds.');
      }
    }

    // 5. Final Decision Calculation
    let decision: 'ALLOW' | 'DENY' | 'MANUAL_REVIEW' = 'ALLOW';
    
    if (trustScore <= 0) decision = 'DENY';
    else if (trustScore < 70) decision = 'MANUAL_REVIEW';
    
    if (reasons.length === 0) reasons.push('Verification Passed');

    // 6. Record Verification Log
    const log = await this.prisma.verificationLog.create({
      data: {
        tenantId: req.tenantId,
        credentialId: credential.id,
        deviceId: req.deviceId,
        context: req.context,
        decision,
        trustScore,
        reason: reasons.join(' | '),
        policyVersion: policy.version,
        capabilityProfileVersion: policy.version, // Assuming 1:1 versioning here
        keyVersion: 1, // Stubbed, would come from token payload
        scannedAt: new Date()
      }
    });

    return {
      decision,
      trustScore,
      reasons,
      credentialStatus: credential.status,
      ownerType: credential.ownerType,
      expiresIn: credential.expiresAt ? credential.expiresAt.toISOString() : 'NEVER',
      correlationId: log.id,
      policyVersion: policy.version,
      capabilityProfileVersion: policy.version,
      keyVersion: 1,
      evaluatedAt: new Date()
    };
  }

  private async deny(
    req: VerificationRequest, 
    credentialId: string | null, 
    reasons: string[], 
    trustScore: number, 
    policyVersion?: number
  ): Promise<VerificationDecision> {
    const log = await this.prisma.verificationLog.create({
      data: {
        tenantId: req.tenantId,
        credentialId,
        deviceId: req.deviceId,
        context: req.context,
        decision: 'DENY',
        trustScore,
        reason: reasons.join(' | '),
        policyVersion,
        capabilityProfileVersion: policyVersion,
        scannedAt: new Date()
      }
    });

    return {
      decision: 'DENY',
      trustScore,
      reasons,
      credentialStatus: null,
      ownerType: null,
      expiresIn: null,
      correlationId: log.id,
      policyVersion,
      capabilityProfileVersion: policyVersion,
      evaluatedAt: new Date()
    };
  }
}
