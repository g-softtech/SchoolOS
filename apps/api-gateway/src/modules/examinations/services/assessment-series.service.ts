import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class AssessmentSeriesService {
  private readonly logger = new Logger(AssessmentSeriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSeries(tenantId: string, name: string, startDate: Date, endDate: Date) {
    this.logger.debug(`Creating AssessmentSeries ${name} for tenant ${tenantId}`);
    return this.prisma.assessmentSeries.create({
      data: {
        tenantId,
        name,
        startDate,
        endDate,
        status: 'ACTIVE',
      },
    });
  }
}
