import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '../../../prisma/generated/client';

@Injectable()
export class CredentialIntegrityAuditor {
  private readonly logger = new Logger(CredentialIntegrityAuditor.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Continuous background verification of credential system health.
   * Runs nightly to detect orphaned credentials, stale devices, and policy violations.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runAudit() {
    this.logger.log('Starting Credential Integrity Audit...');
    let anomaliesDetected = 0;

    anomaliesDetected += await this.auditDuplicateActiveCredentials();
    anomaliesDetected += await this.auditExpiredActiveCredentials();
    anomaliesDetected += await this.auditDeviceHealth();
    anomaliesDetected += await this.auditSigningKeyRotation();

    if (anomaliesDetected > 0) {
      this.logger.warn(`Credential Integrity Audit completed with ${anomaliesDetected} anomalies detected. Manual review required.`);
    } else {
      this.logger.log('Credential Integrity Audit completed successfully. 0 anomalies detected.');
    }
  }

  private async auditDuplicateActiveCredentials(): Promise<number> {
    // Detect if a single user has multiple active credentials of the same ownerType 
    // exceeding the policy maxActiveVersions.
    const violations = await this.prisma.$queryRaw<{userId: string, count: number}[]>`
      SELECT "userId", count(*) as count 
      FROM "Credential" 
      WHERE status IN ('ACTIVATED', 'REPLACED')
      GROUP BY "userId", "ownerType"
      HAVING count(*) > 1
    `;

    if (violations.length > 0) {
      this.logger.error(`Detected ${violations.length} users with multiple active credentials exceeding typical policy limits.`);
    }
    return violations.length;
  }

  private async auditExpiredActiveCredentials(): Promise<number> {
    const expiredActive = await this.prisma.credential.count({
      where: {
        status: { in: ['ACTIVATED', 'REPLACED'] },
        expiresAt: { lt: new Date() }
      }
    });

    if (expiredActive > 0) {
      this.logger.error(`Found ${expiredActive} active credentials that have passed their expiration date. ExpirationService may be failing.`);
    }
    return expiredActive;
  }

  private async auditDeviceHealth(): Promise<number> {
    let anomalies = 0;
    
    // Check for extreme clock drift (e.g., > 5 minutes / 300000ms)
    const driftingDevices = await this.prisma.credentialDevice.findMany({
      where: {
        status: 'ACTIVE',
        clockDriftMs: { gt: 300000 }
      }
    });

    for (const device of driftingDevices) {
      this.logger.warn(`Device ${device.deviceName} (${device.id}) exhibits severe clock drift (${device.clockDriftMs}ms). Transitioning to QUARANTINED.`);
      await this.prisma.credentialDevice.update({
        where: { id: device.id },
        data: { status: 'QUARANTINED' }
      });
      anomalies++;
    }

    return anomalies;
  }

  private async auditSigningKeyRotation(): Promise<number> {
    const staleKeys = await this.prisma.signingKey.count({
      where: {
        status: 'ACTIVE',
        activeFrom: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // Older than 1 year
      }
    });

    if (staleKeys > 0) {
      this.logger.warn(`Detected ${staleKeys} active signing keys older than 1 year. Key rotation is recommended.`);
    }
    return staleKeys;
  }
}
