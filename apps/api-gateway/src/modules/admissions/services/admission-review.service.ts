import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { AdmissionReviewRepository } from '../repositories';
import { WorkspaceContext } from '../../shared/context/workspace-context';
import { PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class AdmissionReviewService {
  constructor(
    private readonly reviewRepo: AdmissionReviewRepository,
    private readonly eventBus: PlatformEventBus,
  ) {}

  /**
   * Multi-reviewer architecture constraint: 
   * No reviewer may overwrite another reviewer's review.
   */
  async submitReview(
    ctx: WorkspaceContext, 
    applicationId: string, 
    stageId: string, 
    payload: { score?: number, comments?: string, recommendation: any }
  ) {
    const existing = await this.reviewRepo.findExistingReview(applicationId, ctx.userId, stageId);
    
    if (existing) {
      throw new ConflictException('You have already submitted a review for this application in this stage. Overwrites are forbidden.');
    }

    const review = await this.reviewRepo.create({
      applicationId,
      reviewerId: ctx.userId,
      stageId,
      score: payload.score,
      comments: payload.comments,
      recommendation: payload.recommendation,
      version: 1
    });

    // Audit Log
    await this.eventBus.publish({
      type: 'AuditLog',
      producer: 'AdmissionsModule',
      tenantId: ctx.tenantId,
      payload: {
        action: 'REVIEW_COMPLETED',
        entity: 'AdmissionReview',
        entityId: review.id,
        userId: ctx.userId,
        metadata: { applicationId, stageId, recommendation: payload.recommendation }
      },
      version: 1
    });

    // Domain Event
    await this.eventBus.publish({
      type: 'ReviewCompleted',
      producer: 'AdmissionsModule',
      tenantId: ctx.tenantId,
      payload: { reviewId: review.id, applicationId, stageId },
      version: 1
    });

    return review;
  }
}
