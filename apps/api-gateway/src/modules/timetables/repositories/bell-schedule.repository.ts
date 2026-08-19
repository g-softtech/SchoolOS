import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { Prisma, BellSchedule } from '@saas/core-platform';

@Injectable()
export class BellScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.BellScheduleUncheckedCreateInput): Promise<BellSchedule> {
    return this.prisma.bellSchedule.create({ data });
  }

  async findById(id: string, tenantId: string): Promise<BellSchedule | null> {
    return this.prisma.bellSchedule.findUnique({
      where: { id, tenantId },
    });
  }

  async findMany(tenantId: string): Promise<BellSchedule[]> {
    return this.prisma.bellSchedule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, tenantId: string, data: Prisma.BellScheduleUncheckedUpdateInput): Promise<BellSchedule> {
    return this.prisma.bellSchedule.update({
      where: { id, tenantId },
      data,
    });
  }

  async delete(id: string, tenantId: string): Promise<BellSchedule> {
    return this.prisma.bellSchedule.delete({
      where: { id, tenantId },
    });
  }
}
