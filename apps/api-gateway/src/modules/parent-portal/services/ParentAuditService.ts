import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../../../packages/core-platform/prisma/generated/client';
import { FamilyContext } from '../auth/FamilyContext';

@Injectable()
export class ParentAuditService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Logs significant Parent Portal actions for compliance and dispute resolution.
   */
  async logAction(context: FamilyContext, action: string, metadata: Record<string, any> = {}) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId, // The parent's user identity
        action, // e.g., 'GUARDIAN_VIEWED_REPORT_CARD', 'GUARDIAN_ACCEPTED_PAYMENT_PLAN'
        entity: 'Guardian',
        entityId: context.guardianId,
        metadata, // e.g., { studentId: '123', term: 'Fall 2026' }
      }
    });
  }
}
