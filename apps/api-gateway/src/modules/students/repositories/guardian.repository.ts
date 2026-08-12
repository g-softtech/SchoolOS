import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { Guardian, Prisma } from '@saas/core-platform';

@Injectable()
export class GuardianRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.GuardianCreateInput): Promise<Guardian> {
    return this.prisma.guardian.create({ data });
  }

  async findById(id: string, tenantId: string): Promise<Guardian | null> {
    return this.prisma.guardian.findUnique({
      where: { id, tenantId },
      include: {
        students: {
          include: { student: true }
        }
      }
    });
  }

  async update(id: string, tenantId: string, data: Prisma.GuardianUpdateInput): Promise<Guardian> {
    return this.prisma.guardian.update({
      where: { id, tenantId },
      data,
    });
  }
}
