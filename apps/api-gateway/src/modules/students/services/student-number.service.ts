import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class StudentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async generateStudentNumber(tenantId: string): Promise<string> {
    // Lock the row to prevent race conditions during sequence increment
    const strategy = await this.prisma.$transaction(async (tx) => {
      let config = await tx.studentNumberStrategy.findUnique({
        where: { tenantId }
      });

      if (!config) {
        config = await tx.studentNumberStrategy.create({
          data: { tenantId, prefix: 'STU', sequence: 0 }
        });
      }

      return tx.studentNumberStrategy.update({
        where: { id: config.id },
        data: { sequence: { increment: 1 } }
      });
    });

    // Example padding: STU-2026-0001
    const paddedSequence = String(strategy.sequence).padStart(4, '0');
    return strategy.year 
      ? `${strategy.prefix}-${strategy.year}-${paddedSequence}`
      : `${strategy.prefix}-${paddedSequence}`;
  }
}
