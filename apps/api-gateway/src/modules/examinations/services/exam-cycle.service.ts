import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class ExamCycleService {
  private readonly logger = new Logger(ExamCycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCycle(tenantId: string, seriesId: string, termId: string, name: string, type: string) {
    this.logger.debug(`Creating ExamCycle ${name} for tenant ${tenantId}`);
    return this.prisma.examCycle.create({
      data: {
        tenantId,
        seriesId,
        termId,
        name,
        type,
        status: 'UPCOMING',
      },
    });
  }
}
