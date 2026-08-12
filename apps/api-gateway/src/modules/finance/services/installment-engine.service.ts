import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class InstallmentEngineService {
  private readonly logger = new Logger(InstallmentEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPlan(tenantId: string, invoiceId: string, template: any) {
    this.logger.debug(`Creating InstallmentPlan for invoice ${invoiceId}`);
    // Break invoice into InstallmentSchedules
  }
}
