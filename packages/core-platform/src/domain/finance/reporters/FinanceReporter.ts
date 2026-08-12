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
        // Example: calculate total payments vs total invoices for a term
        // This is a heavy calculation typically done in a background job, but defined here for portability
        const result = await this.prisma.$queryRaw<{ collectionRate: number }[]>`
          SELECT 
            CASE 
              WHEN SUM(invoice_amount) > 0 THEN (SUM(payment_amount) / SUM(invoice_amount)) * 100
              ELSE 0 
            END as "collectionRate"
          FROM "FinancialLedgerSnapshot" 
          WHERE tenant_id = ${ctx.tenantId}
        `;
        const rate = result[0]?.collectionRate || 0;
        return { value: rate, explanationArgs: { rate } };
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
        if (!ctx.studentId) throw new Error('studentId is required for OUTSTANDING_BALANCE_V1');
        
        // Example: Derived live from the actual transactional ledger
        const ledger = await this.prisma.financialTransaction.aggregate({
          where: { tenantId: ctx.tenantId, studentId: ctx.studentId },
          _sum: { amount: true } // Assuming normalized debit/credit arithmetic
        });
        
        const balance = Number(ledger._sum.amount) || 0;
        return { value: balance, explanationArgs: { balance } };
      }
    });

    this.logger.log('Registered Finance Metrics with MetricRegistry');
  }
}
