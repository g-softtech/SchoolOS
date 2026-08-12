import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '../../../prisma/generated/client';

@Injectable()
export class CredentialExpirationService {
  private readonly logger = new Logger(CredentialExpirationService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Background CRON to expire active credentials that have passed their `expiresAt` date.
   * "Don't wait until someone scans an expired credential."
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processExpirations() {
    this.logger.log('Starting Credential Expiration Sweep...');
    const now = new Date();

    const expiredCredentials = await this.prisma.credential.findMany({
      where: {
        status: { in: ['ACTIVATED', 'REPLACED'] },
        expiresAt: { lt: now }
      },
      include: {
        versions: { where: { status: 'ACTIVE' } }
      }
    });

    if (expiredCredentials.length === 0) {
      this.logger.log('No credentials to expire at this time.');
      return;
    }

    let expiredCount = 0;

    for (const credential of expiredCredentials) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Update Credential Status
          await tx.credential.update({
            where: { id: credential.id },
            data: { status: 'EXPIRED' }
          });

          // 2. Revoke active versions
          for (const version of credential.versions) {
            await tx.credentialVersion.update({
              where: { id: version.id },
              data: { status: 'SUPERSEDED' }
            });
          }

          // 3. Emit Timeline Event
          await tx.credentialTimeline.create({
            data: {
              credentialId: credential.id,
              event: 'EXPIRED',
              description: `Credential expired organically at ${credential.expiresAt?.toISOString()}`
            }
          });

          // 4. (Future) Emit Integration Event `CredentialExpired` to EventBus
          
        });
        expiredCount++;
      } catch (err) {
        this.logger.error(`Failed to expire credential ${credential.id}: ${err.message}`);
      }
    }

    this.logger.log(`Credential Expiration Sweep Complete. Expired ${expiredCount} credentials.`);
  }
}
