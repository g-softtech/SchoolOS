import { Module } from '@nestjs/common';

// Controllers
import { AdmissionsCampaignController } from './controllers/admissions-campaign.controller';
import { AdmissionsApplicationController } from './controllers/admissions-application.controller';
import { AdmissionsWorkflowController } from './controllers/admissions-workflow.controller';

// Repositories
import { AdmissionApplicationRepository } from './repositories/admission-application.repository';
import { AdmissionCampaignRepository } from './repositories/admission-campaign.repository';
import { AdmissionWorkflowRepository } from './repositories/admission-workflow.repository';

// Services
import { AdmissionApplicationService } from './services/admission-application.service';
import { AdmissionCampaignService } from './services/admission-campaign.service';
import { AdmissionWorkflowService } from './services/admission-workflow.service';
import { AdmissionReviewService } from './services/admission-review.service';
import { AdmissionDocumentService } from './services/admission-document.service';
import { AdmissionFormService } from './services/admission-form.service';
import { AdmissionNumberService } from './services/admission-number.service';

@Module({
  imports: [], // Add DatabaseModule, WorkspaceModule etc. when hooking up to core
  controllers: [
    AdmissionsCampaignController,
    AdmissionsApplicationController,
    AdmissionsWorkflowController,
  ],
  providers: [
    // Repositories
    AdmissionApplicationRepository,
    AdmissionCampaignRepository,
    AdmissionWorkflowRepository,
    // Services
    AdmissionApplicationService,
    AdmissionCampaignService,
    AdmissionWorkflowService,
    AdmissionReviewService,
    AdmissionDocumentService,
    AdmissionFormService,
    AdmissionNumberService,
  ],
  exports: [
    AdmissionApplicationService,
    AdmissionCampaignService,
    AdmissionWorkflowService,
    AdmissionReviewService,
    AdmissionDocumentService,
    AdmissionFormService,
    AdmissionNumberService,
  ],
})
export class AdmissionsModule {}
