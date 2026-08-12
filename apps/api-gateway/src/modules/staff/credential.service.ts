import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';

/**
 * CredentialService owns the IdentityCredential lifecycle:
 *   ISSUED -> ACTIVE -> SUSPENDED -> REVOKED -> EXPIRED
 *
 * Key rule: Issuing a new credential of the same type for an employee
 * automatically revokes the existing ACTIVE/ISSUED credential of that type.
 * This ensures only one active credential per type per employee at any time.
 *
 * The QR code image is NOT generated here. That responsibility belongs to
 * the ID Card module, which reads the credential token and renders it.
 */
@Injectable()
export class CredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async issueCredential(
    tenantId: string,
    employeeId: string,
    type: string,
    expiresAt?: Date,
  ) {
    // Verify employee exists
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Auto-revoke any existing active credential of the same type
    const existing = await this.prisma.identityCredential.findFirst({
      where: { tenantId, employeeId, type, status: { in: ['ISSUED', 'ACTIVE'] } },
    });

    if (existing) {
      await this.prisma.identityCredential.update({
        where: { id: existing.id },
        data: { status: 'REVOKED' },
      });
      this.eventEmitter.emit('Staff.Credential.Revoked', {
        tenantId,
        credentialId: existing.id,
        employeeId,
        reason: 'Replaced by new credential',
      });
    }

    // Generate a cryptographically random token
    const token = randomBytes(32).toString('hex');

    const credential = await this.prisma.identityCredential.create({
      data: {
        tenantId,
        employeeId,
        type,
        token,
        status: 'ACTIVE',
        issuedAt: new Date(),
        expiresAt,
      },
    });

    this.eventEmitter.emit('Staff.Credential.Issued', {
      tenantId,
      credentialId: credential.id,
      employeeId,
      type,
    });

    return credential;
  }

  async revokeCredential(tenantId: string, credentialId: string, reason: string) {
    const credential = await this.prisma.identityCredential.findFirst({
      where: { id: credentialId, tenantId },
    });
    if (!credential) throw new NotFoundException('Credential not found');
    if (credential.status === 'REVOKED') throw new ConflictException('Credential is already revoked');

    const updated = await this.prisma.identityCredential.update({
      where: { id: credentialId },
      data: { status: 'REVOKED' },
    });

    this.eventEmitter.emit('Staff.Credential.Revoked', {
      tenantId,
      credentialId,
      employeeId: credential.employeeId,
      reason,
    });

    return updated;
  }

  /**
   * Validates a raw credential token — used by the Attendance module during a scan.
   * Returns the employeeId for the active credential matching this token, or null.
   */
  async validateToken(token: string): Promise<string | null> {
    const credential = await this.prisma.identityCredential.findFirst({
      where: { token, status: 'ACTIVE' },
      select: { employeeId: true },
    });
    return credential?.employeeId ?? null;
  }
}
