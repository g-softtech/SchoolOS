import { Injectable, BadRequestException } from '@nestjs/common';
import { AdmissionFormRepository } from '../repositories';
import { WorkspaceContext } from '../../shared/context/workspace-context';

@Injectable()
export class AdmissionFormService {
  constructor(private readonly formRepo: AdmissionFormRepository) {}

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
    return this.formRepo.prisma.$transaction(async (tx) => {
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
                create: f.options?.map(o => ({ value: o.value })) || []
              }
            }))
          }
        }
      });

      return newForm;
    });
  }
}
