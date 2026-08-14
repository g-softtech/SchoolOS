import { Module } from '@nestjs/common';
import { CorePlatformModule } from '@saas/core-platform';

// Controllers
import { AdmissionsCampaignController } from './controllers/admissions-campaign.controller';
import { AdmissionApplicationController } from './controllers/admission-application.controller';
import { AdmissionWorkflowController } from './controllers/admission-workflow.controller';
import { AdmissionReviewController } from './controllers/admission-review.controller';

// Repositories
import { AdmissionApplicationRepository } from './repositories/admission-application.repository';
import { AdmissionCampaignRepository } from './repositories/admission-campaign.repository';
import { AdmissionWorkflowRepository } from './repositories/admission-workflow.repository';
import { AdmissionReviewRepository } from './repositories/admission-review.repository';
import { AdmissionFormRepository } from './repositories/admission-form.repository';

// Services
import { AdmissionApplicationService } from './services/admission-application.service';
import { AdmissionCampaignService } from './services/admission-campaign.service';
import { AdmissionWorkflowService } from './services/admission-workflow.service';
import { AdmissionReviewService } from './services/admission-review.service';
import { AdmissionDocumentService } from './services/admission-document.service';
import { AdmissionFormService } from './services/admission-form.service';
import { AdmissionNumberService } from './services/admission-number.service';

@Module({
  imports: [CorePlatformModule],
  controllers: [
    AdmissionsCampaignController,
    AdmissionApplicationController,
    AdmissionWorkflowController,
    AdmissionReviewController,
  ],
  providers: [
    // Repositories
    AdmissionApplicationRepository,
    AdmissionCampaignRepository,
    AdmissionWorkflowRepository,
    AdmissionReviewRepository,
    AdmissionFormRepository,
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
