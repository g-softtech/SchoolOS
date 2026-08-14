import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkspaceContext, OutboxService, PrismaService } from '@saas/core-platform';

@Injectable()
export class AdmissionDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  async defineRequiredDocument(ctx: WorkspaceContext, name: string, isRequired: boolean = true) {
    const tenantId = ctx.tenantId;
    
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.admissionRequiredDocument.create({
        data: {
          tenantId,
          name,
          isRequired,
        }
      });

      await this.outboxService.appendEvent(tx, {
        eventType: 'Admissions.DocumentRule.Created',
        aggregateId: rule.id,
        aggregateType: 'AdmissionRequiredDocument',
        tenantId,
        payload: { tenantId, ruleId: rule.id, name, isRequired },
        version: 1
      });

      return rule;
    });
  }

  async verifyDocument(ctx: WorkspaceContext, applicationId: string, documentId: string, status: any) {
    const tenantId = ctx.tenantId;
    
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.admissionDocument.updateMany({
        where: { id: documentId, applicationId }, // Can't easily filter by tenantId without join, so using applicationId which is bound to tenant
        data: { verificationStatus: status }
      });

      if (updated.count === 0) {
        throw new NotFoundException('Document not found or access denied');
      }

      await this.outboxService.appendEvent(tx, {
        eventType: 'Admissions.Document.Verified',
        aggregateId: documentId,
        aggregateType: 'AdmissionDocument',
        tenantId,
        payload: {
          tenantId,
          applicationId,
          documentId,
          status,
          actorId: ctx.userId,
        },
        version: 1
      });

      return { id: documentId, verificationStatus: status };
    });
  }
}
