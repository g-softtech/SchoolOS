import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';
import { AdmissionReview, Prisma } from '@saas/core-platform';

@Injectable()
export class AdmissionReviewRepository extends BaseRepository<
  AdmissionReview,
  Prisma.AdmissionReviewCreateArgs,
  Prisma.AdmissionReviewUpdateArgs,
  Prisma.AdmissionReviewFindUniqueArgs,
  Prisma.AdmissionReviewFindFirstArgs,
  Prisma.AdmissionReviewFindManyArgs
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.admissionReview);
  }

  async findExistingReview(applicationId: string, reviewerId: string, stageId: string): Promise<AdmissionReview | null> {
    return this.model.findUnique({
      where: {
        applicationId_reviewerId_stageId: {
          applicationId,
          reviewerId,
          stageId
        }
      }
    });
  }
}
