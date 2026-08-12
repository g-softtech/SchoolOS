import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';
import { AdmissionWorkflow, Prisma } from '@saas/core-platform';

@Injectable()
export class AdmissionWorkflowRepository extends BaseRepository<
  AdmissionWorkflow,
  Prisma.AdmissionWorkflowCreateArgs,
  Prisma.AdmissionWorkflowUpdateArgs,
  Prisma.AdmissionWorkflowFindUniqueArgs,
  Prisma.AdmissionWorkflowFindFirstArgs,
  Prisma.AdmissionWorkflowFindManyArgs
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.admissionWorkflow);
  }

  async findWithStages(tenantId: string, workflowId: string): Promise<AdmissionWorkflow | null> {
    return this.model.findUnique({
      where: { id: workflowId, tenantId, deletedAt: null },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
  }

  async findDefaultWorkflow(tenantId: string): Promise<AdmissionWorkflow | null> {
    return this.model.findFirst({
      where: { tenantId, isDefault: true, deletedAt: null },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
  }
}
