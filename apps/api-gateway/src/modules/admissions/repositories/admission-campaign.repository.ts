import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { BaseRepository, PaginatedResult } from '../../shared/repositories/base.repository';
import { AdmissionCampaign, Prisma } from '@saas/core-platform';

@Injectable()
export class AdmissionCampaignRepository extends BaseRepository<
  AdmissionCampaign,
  Prisma.AdmissionCampaignCreateArgs,
  Prisma.AdmissionCampaignUpdateArgs,
  Prisma.AdmissionCampaignFindUniqueArgs,
  Prisma.AdmissionCampaignFindFirstArgs,
  Prisma.AdmissionCampaignFindManyArgs
> {
  constructor(public readonly prisma: PrismaService) {
    super(prisma, prisma.admissionCampaign);
  }

  // Support for transactions
  async transaction<T>(action: (repo: AdmissionCampaignRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const repo = new AdmissionCampaignRepository(tx as PrismaService);
      return action(repo);
    });
  }

  async searchCampaigns(tenantId: string, params: {
    status?: string;
    academicYearId?: string;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AdmissionCampaignOrderByWithRelationInput;
  }): Promise<PaginatedResult<AdmissionCampaign>> {
    const where: Prisma.AdmissionCampaignWhereInput = {
      tenantId,
      deletedAt: null,
      ...(params.status && { status: params.status as any }),
      ...(params.academicYearId && { academicYearId: params.academicYearId }),
    };

    return this.paginate(
      { where, orderBy: params.orderBy || { createdAt: 'desc' } },
      params.skip || 0,
      params.take || 20
    );
  }
}
