import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { BaseRepository, PaginatedResult } from '../../shared/repositories/base.repository';
import { AdmissionApplication, Prisma } from '@saas/core-platform';

@Injectable()
export class AdmissionApplicationRepository extends BaseRepository<
  AdmissionApplication,
  Prisma.AdmissionApplicationCreateArgs,
  Prisma.AdmissionApplicationUpdateArgs,
  Prisma.AdmissionApplicationFindUniqueArgs,
  Prisma.AdmissionApplicationFindFirstArgs,
  Prisma.AdmissionApplicationFindManyArgs
> {
  constructor(public readonly prisma: PrismaService) {
    super(prisma, prisma.admissionApplication);
  }

  // Support for transactions
  async transaction<T>(action: (repo: AdmissionApplicationRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const repo = new AdmissionApplicationRepository(tx as PrismaService);
      return action(repo);
    });
  }

  async searchApplications(tenantId: string, params: {
    campaignId?: string;
    stageId?: string;
    paymentStatus?: string;
    searchQuery?: string;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AdmissionApplicationOrderByWithRelationInput;
  }): Promise<PaginatedResult<AdmissionApplication>> {
    const where: Prisma.AdmissionApplicationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(params.campaignId && { campaignId: params.campaignId }),
      ...(params.stageId && { currentStageId: params.stageId }),
      ...(params.paymentStatus && { paymentStatus: params.paymentStatus as any }),
      ...(params.searchQuery && {
        OR: [
          { studentFirstName: { contains: params.searchQuery, mode: 'insensitive' } },
          { studentLastName: { contains: params.searchQuery, mode: 'insensitive' } },
          { admissionNumber: { contains: params.searchQuery, mode: 'insensitive' } },
        ]
      })
    };

    return this.paginate(
      { 
        where, 
        orderBy: params.orderBy || { createdAt: 'desc' },
        include: {
          currentStage: true,
          reviews: true
        }
      },
      params.skip || 0,
      params.take || 20
    );
  }

  async updateStageWithLock(
    tenantId: string, 
    applicationId: string, 
    stageId: string, 
    version: number, 
    tx?: Prisma.TransactionClient
  ): Promise<AdmissionApplication> {
    const client = tx || this.prisma;
    
    const updateResult = await client.admissionApplication.updateMany({
      where: { id: applicationId, tenantId, version, deletedAt: null },
      data: {
        currentStageId: stageId,
        version: { increment: 1 }
      }
    });

    if (updateResult.count === 0) {
      throw new Error('Optimistic Locking Failure or Application Not Found');
    }

    return client.admissionApplication.findUniqueOrThrow({ where: { id: applicationId } });
  }
}
