import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdmissionCampaignRepository } from '../repositories/admission-campaign.repository';
import { WorkspaceContext } from '@saas/core-platform';


@Injectable()
export class AdmissionCampaignService {
  constructor(
    private readonly campaignRepo: AdmissionCampaignRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly workspace: WorkspaceContext,
  ) {}

  async createCampaign(data: { name: string; academicYearId: string; startDate: Date; endDate: Date; maxApplicants?: number; applicationFee?: number; allowedClasses?: any }) {
    const tenantId = this.workspace.tenantId;

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
      allowedClasses: data.allowedClasses,
      status: 'DRAFT',
      actorId: this.workspace.userId,
    };

    const campaign = await this.campaignRepo.create(payload);

    this.eventEmitter.emit('Admissions.Campaign.Created', { tenantId, campaignId: campaign.id });
    
    return campaign;
  }

  async activateCampaign(campaignId: string) {
    const tenantId = this.workspace.tenantId;
    
    const updated = await this.campaignRepo.update(campaignId, tenantId, {
      status: 'ACTIVE',
      updatedBy: this.workspace.userId,
    });

    this.eventEmitter.emit('Admissions.Campaign.Activated', { tenantId, campaignId: updated.id });
    return updated;
  }
}
