import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../../prisma/generated/client';
import { MetricRegistry, MetricCalculationContext } from '../../reporting/MetricRegistry';

@Injectable()
export class FinanceReporter implements OnModuleInit {
  private readonly logger = new Logger(FinanceReporter.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metricRegistry: MetricRegistry
  ) {}

  onModuleInit() {
    this.registerMetrics();
  }

  private registerMetrics() {
    // 1. COLLECTION_RATE_V1 (Analytical Layer 2)
    this.metricRegistry.register({
      metricName: 'COLLECTION_RATE',
      metricVersion: 'v1',
      ownership: {
        technicalOwner: FinanceReporter.name,
        businessOwner: 'Finance Domain',
        approvedBy: 'Reporting Governance Board'
      },
      certificationStatus: 'CERTIFIED',
      expectedSLA: 'NIGHTLY',
      isOperational: false, // Scheduled projection
      dependsOn: [],
      explainabilityTemplate: 'Collection rate is {rate}% based on total invoices generated vs received payments.',
      calculate: async (ctx: MetricCalculationContext) => {
        const result = await this.prisma.invoice.aggregate({
          where: { tenantId: ctx.tenantId, status: { not: 'DRAFT' } },
          _sum: { totalAmount: true, amountPaid: true }
        });
        
        const total = Number(result._sum.totalAmount || 0);
        const paid = Number(result._sum.amountPaid || 0);
        const rate = total > 0 ? (paid / total) * 100 : 0;
        
        return { value: rate, explanationArgs: { rate: rate.toFixed(2) } };
      }
    });

    // 2. OUTSTANDING_BALANCE_V1 (Operational Layer 1)
    this.metricRegistry.register({
      metricName: 'OUTSTANDING_BALANCE',
      metricVersion: 'v1',
      ownership: {
        technicalOwner: FinanceReporter.name,
        businessOwner: 'Finance Domain',
        approvedBy: 'Reporting Governance Board'
      },
      certificationStatus: 'CERTIFIED',
      expectedSLA: 'REAL_TIME',
      isOperational: true, // Live
      dependsOn: [],
      explainabilityTemplate: 'Outstanding balance of {balance} is derived directly from the canonical Finance Ledger.',
      calculate: async (ctx: MetricCalculationContext) => {
        const where: any = { tenantId: ctx.tenantId, status: { not: 'DRAFT' } };
        if (ctx.studentId) {
          where.studentId = ctx.studentId;
        }        
        const result = await this.prisma.invoice.aggregate({
          where,
          _sum: { totalAmount: true, amountPaid: true }
        });
        
        const total = Number(result._sum.totalAmount || 0);
        const paid = Number(result._sum.amountPaid || 0);
        const balance = total - paid;
        
        return { value: balance, explanationArgs: { balance } };
      }
    });

    this.logger.log('Registered Finance Metrics with MetricRegistry');
  }
}
