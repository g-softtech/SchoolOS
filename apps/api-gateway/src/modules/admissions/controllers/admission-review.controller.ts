import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { AdmissionReviewService } from '../services/admission-review.service';
import { WorkspaceContext } from '@saas/core-platform';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { SubmitReviewDto } from '../dto/review/submit-review.dto';
import { AdmissionReviewRepository } from '../repositories/admission-review.repository';

@Controller('api/v1/admissions/applications')
export class AdmissionReviewController {
  constructor(
    private readonly reviewService: AdmissionReviewService,
    private readonly reviewRepo: AdmissionReviewRepository
  ) {}

  @Post(':id/reviews')
  @RequirePermission('admissions.review.create')
  async submitReview(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') applicationId: string,
    @Body() payload: SubmitReviewDto
  ) {
    return this.reviewService.submitReview(ctx, applicationId, payload.stageId, {
      score: payload.score,
      comments: payload.comments,
      recommendation: payload.recommendation
    });
  }

  @Get(':id/reviews')
  @RequirePermission('admissions.review.read')
  async getApplicationReviews(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') applicationId: string
  ) {
    const reviews = await this.reviewRepo.findMany({
      where: {
        applicationId,
        application: { tenantId: ctx.tenantId },
        deletedAt: null
      },
      include: {
        stage: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: reviews };
  }
}
