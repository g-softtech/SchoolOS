import { Injectable, BadRequestException } from '@nestjs/common';
import { AdmissionCampaignRepository } from '../repositories/admission-campaign.repository';
import { WorkspaceContext, OutboxService } from '@saas/core-platform';

@Injectable()
export class AdmissionCampaignService {
  constructor(
    private readonly campaignRepo: AdmissionCampaignRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async createCampaign(ctx: WorkspaceContext, data: { name: string; academicYearId: string; startDate: Date; endDate: Date; maxApplicants?: number; applicationFee?: number; allowedClasses?: any; workflowId?: string }) {
    const tenantId = ctx.tenantId;

    if (data.startDate >= data.endDate) {
      throw new BadRequestException('Start date must be before end date.');
    }

    const payload: any = {
      tenantId,
      name: data.name,
      academicYearId: data.academicYearId,
      startDate: data.startDate,
      endDate: data.endDate,
      maxApplicants: data.maxApplicants,
      applicationFee: data.applicationFee ? data.applicationFee : null,
      allowedClasses: data.allowedClasses ?? [],
      status: 'DRAFT',
      workflowId: data.workflowId,
    };

    return this.campaignRepo.transaction(async (repo) => {
      const campaign = await repo.create({ data: payload });

      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Admissions.Campaign.Created',
        aggregateId: campaign.id,
        aggregateType: 'AdmissionCampaign',
        tenantId,
        version: 1,
        payload: { tenantId, campaignId: campaign.id, actorId: ctx.userId }
      });

      return campaign;
    });
  }

  async activateCampaign(ctx: WorkspaceContext, campaignId: string) {
    const tenantId = ctx.tenantId;

    return this.campaignRepo.transaction(async (repo) => {
      const updated = await repo.update(campaignId, tenantId, {
        status: 'ACTIVE',
        updatedBy: ctx.userId,
      });

      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Admissions.Campaign.Activated',
        aggregateId: updated.id,
        aggregateType: 'AdmissionCampaign',
        tenantId,
        version: 1,
        payload: { tenantId, campaignId: updated.id }
      });

      return updated;
    });
  }
}
