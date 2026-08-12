import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated/client';

export interface IssueCredentialRequest {
  tenantId: string;
  userId: string;
  ownerType: string; // 'STUDENT', 'STAFF', etc.
  medium: string;    // 'PVC', 'MOBILE', etc.
}

@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * One credential lifecycle: Requested -> Generated -> Issued -> Activated -> Suspended -> Expired -> Revoked -> Replaced.
   */
  async issueNewCredential(req: IssueCredentialRequest) {
    // Identity owns identity: Check if User exists
    const user = await this.prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      throw new Error('Identity owns identity. Credentials cannot be issued for a non-existent User.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Credential (Base Record)
      const credential = await tx.credential.create({
        data: {
          tenantId: req.tenantId,
          userId: req.userId,
          ownerType: req.ownerType,
          medium: req.medium,
          status: 'ACTIVATED', // Skipping directly to Activated for this example
          issuedAt: new Date()
        }
      });

      // 2. Create Initial Version
      const version = await tx.credentialVersion.create({
        data: {
          credentialId: credential.id,
          versionNumber: 1,
          token: this.generateSignedTokenStub(), // Replaced by QRService in reality
          status: 'ACTIVE'
        }
      });

      // 3. Emit Timeline Event
      await tx.credentialTimeline.create({
        data: {
          credentialId: credential.id,
          event: 'ACTIVATED',
          description: `Credential generated and activated (Version 1)`
        }
      });

      return { credential, version };
    });
  }

  /**
   * Lost / Stolen Workflow
   * ACTIVE -> REPORTED_LOST -> REVOKED -> REPLACED
   */
  async reportLostAndReissue(credentialId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const credential = await tx.credential.findUnique({
        where: { id: credentialId },
        include: { versions: { where: { status: 'ACTIVE' } } }
      });

      if (!credential) throw new Error('Credential not found');

      // 1. Revoke active version
      for (const version of credential.versions) {
        await tx.credentialVersion.update({
          where: { id: version.id },
          data: { status: 'REVOKED' }
        });
      }

      // 2. Timeline Events
      await tx.credentialTimeline.create({
        data: { credentialId, event: 'REPORTED_LOST', description: 'User reported credential lost.' }
      });
      await tx.credentialTimeline.create({
        data: { credentialId, event: 'REVOKED', description: 'Prior version revoked due to loss.' }
      });

      // 3. Reissue New Version
      const newVersionNum = credential.versions.length ? credential.versions[0].versionNumber + 1 : 2;
      
      const newVersion = await tx.credentialVersion.create({
        data: {
          credentialId,
          versionNumber: newVersionNum,
          token: this.generateSignedTokenStub(),
          status: 'ACTIVE'
        }
      });

      await tx.credential.update({
        where: { id: credentialId },
        data: { status: 'REPLACED' } // State reflects it has been reissued
      });

      await tx.credentialTimeline.create({
        data: { credentialId, event: 'REPLACED', description: `New version ${newVersionNum} issued.` }
      });

      return newVersion;
    });
  }

  private generateSignedTokenStub(): string {
    return `TOKEN-${Math.random().toString(36).substring(7)}`;
  }
}
