import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';
import { AdmissionForm, Prisma } from '@saas/core-platform';

@Injectable()
export class AdmissionFormRepository extends BaseRepository<
  AdmissionForm,
  Prisma.AdmissionFormCreateArgs,
  Prisma.AdmissionFormUpdateArgs,
  Prisma.AdmissionFormFindUniqueArgs,
  Prisma.AdmissionFormFindFirstArgs,
  Prisma.AdmissionFormFindManyArgs
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.admissionForm);
  }

  async findPublishedForm(tenantId: string, campaignId: string): Promise<AdmissionForm | null> {
    return this.model.findFirst({
      where: { tenantId, campaignId, isPublished: true, deletedAt: null },
      orderBy: { version: 'desc' },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: true
          }
        }
      }
    });
  }
}
