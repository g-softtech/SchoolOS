import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated/client';
import * as crypto from 'crypto';

@Injectable()
export class QRService {
  private readonly logger = new Logger(QRService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generates a signed cryptographic payload for a credential.
   * "QR codes contain no sensitive information. Never embed student name, DOB, etc."
   */
  async generateSignedPayload(tenantId: string, credentialId: string, versionNumber: number): Promise<string> {
    const activeKey = await this.prisma.signingKey.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        activeFrom: { lte: new Date() },
        OR: [
          { activeUntil: null },
          { activeUntil: { gt: new Date() } }
        ]
      },
      orderBy: { version: 'desc' }
    });

    if (!activeKey) {
      throw new Error('No active signing key found for tenant.');
    }

    // Payload contains strictly non-PII identifiers
    const payload = JSON.stringify({
      cid: credentialId,
      v: versionNumber,
      kv: activeKey.version // Key version used to sign
    });

    // In a production system, this should use a proper asymmetric key (RSA/ECC)
    // or an HMAC with KMS integration. 
    // This is a stubbed HMAC implementation for architecture demonstration.
    const hmac = crypto.createHmac('sha256', activeKey.privateKey);
    hmac.update(payload);
    const signature = hmac.digest('base64url');

    return `${Buffer.from(payload).toString('base64url')}.${signature}`;
  }

  /**
   * Rotates the signing key for a tenant.
   * Old credentials remain verifiable because VerificationService looks up the `kv` (Key Version) 
   * from the payload and finds the historical SigningKey, as long as it wasn't COMPROMISED.
   */
  async rotateSigningKey(tenantId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const currentKeys = await tx.signingKey.findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { version: 'desc' }
      });

      const nextVersion = currentKeys.length > 0 ? currentKeys[0].version + 1 : 1;
      
      // Expire current keys
      for (const key of currentKeys) {
        await tx.signingKey.update({
          where: { id: key.id },
          data: {
            activeUntil: new Date(),
            status: 'ROTATED'
          }
        });
      }

      // Generate new keypair (stubbed as a random string here)
      const newPrivateKey = crypto.randomBytes(32).toString('hex');
      const newPublicKey = crypto.createHash('sha256').update(newPrivateKey).digest('hex'); // Stub

      // Activate new key
      const newKey = await tx.signingKey.create({
        data: {
          tenantId,
          version: nextVersion,
          privateKey: newPrivateKey,
          publicKey: newPublicKey,
          activeFrom: new Date(),
          status: 'ACTIVE'
        }
      });

      this.logger.log(`Rotated Signing Key for Tenant ${tenantId}. New Version: ${nextVersion}`);
      return newKey;
    });
  }
}
