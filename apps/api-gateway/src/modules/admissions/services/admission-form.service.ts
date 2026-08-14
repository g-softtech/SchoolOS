import { Injectable, BadRequestException } from '@nestjs/common';
import { AdmissionFormRepository } from '../repositories';
import { WorkspaceContext, OutboxService } from '@saas/core-platform';

@Injectable()
export class AdmissionFormService {
  constructor(
    private readonly formRepo: AdmissionFormRepository,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Fetches a specific version of a form to ensure older applications
   * remain compatible with the exact schema they were submitted under.
   */
  async getFormVersion(ctx: WorkspaceContext, campaignId: string, version: number) {
    const form = await this.formRepo.prisma.admissionForm.findFirst({
      where: { tenantId: ctx.tenantId, campaignId, version },
      include: {
        fields: { orderBy: { orderIndex: 'asc' }, include: { options: true } }
      }
    });

    if (!form) {
      throw new BadRequestException(`Form version ${version} not found for this campaign.`);
    }

    return form;
  }

  /**
   * Publishes a new version of the form. Old versions remain immutable,
   * guaranteeing that past submissions do not lose structural integrity.
   */
  async publishNewVersion(ctx: WorkspaceContext, campaignId: string, fieldsPayload: any[]) {
    return this.formRepo.prisma.$transaction(async (tx: any) => {
      // Find latest version
      const latest = await tx.admissionForm.findFirst({
        where: { tenantId: ctx.tenantId, campaignId },
        orderBy: { version: 'desc' }
      });

      const nextVersion = latest ? latest.version + 1 : 1;

      // Create new version explicitly
      const newForm = await tx.admissionForm.create({
        data: {
          tenantId: ctx.tenantId,
          campaignId,
          version: nextVersion,
          isPublished: true,
          fields: {
            create: fieldsPayload.map((f, i) => ({
              label: f.label,
              type: f.type,
              isRequired: f.isRequired,
              orderIndex: i,
              visibilityRule: f.visibilityRule || {},
              options: {
                create: f.options?.map((o: any) => ({ value: o.value })) || []
              }
            }))
          }
        }
      });

      await this.outboxService.appendEvent(tx, {
        eventType: 'Admissions.Form.Published',
        aggregateId: newForm.id,
        aggregateType: 'AdmissionForm',
        tenantId: ctx.tenantId,
        payload: { formId: newForm.id, campaignId, version: nextVersion },
        version: 1
      });

      // Audit Log
      await this.outboxService.appendEvent(tx, {
        eventType: 'AuditLog',
        aggregateId: newForm.id,
        aggregateType: 'SYSTEM',
        tenantId: ctx.tenantId,
        payload: {
          action: 'FORM_PUBLISHED',
          entity: 'AdmissionForm',
          entityId: newForm.id,
          userId: ctx.userId,
          metadata: { campaignId, version: nextVersion }
        },
        version: 1
      });

      return newForm;
    });
  }
}
