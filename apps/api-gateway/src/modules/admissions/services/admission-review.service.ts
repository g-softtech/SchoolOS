import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { AdmissionReviewRepository } from '../repositories';
import { WorkspaceContext, OutboxService } from '@saas/core-platform';

@Injectable()
export class AdmissionReviewService {
  constructor(
    private readonly reviewRepo: AdmissionReviewRepository,
    private readonly outboxService: OutboxService,
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
    const reviewerId = ctx.userId || '';
    const existing = await this.reviewRepo.findExistingReview(applicationId, reviewerId, stageId);
    
    if (existing) {
      throw new ConflictException('You have already submitted a review for this application in this stage. Overwrites are forbidden.');
    }

    return this.reviewRepo.transaction(async (repo) => {
      const review = await repo.create({
        data: {
          applicationId,
          reviewerId,
          stageId,
          score: payload.score,
          comments: payload.comments,
          recommendation: payload.recommendation,
          version: 1
        }
      });

      // Audit Log
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'AuditLog',
        aggregateId: review.id,
        aggregateType: 'SYSTEM',
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
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Admissions.Review.Completed',
        aggregateId: review.id,
        aggregateType: 'AdmissionReview',
        tenantId: ctx.tenantId,
        payload: { reviewId: review.id, applicationId, stageId },
        version: 1
      });

      return review;
    });
  }
}
