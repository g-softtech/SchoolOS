import { Module } from '@nestjs/common';
import { CorePlatformModule } from '@saas/core-platform';
import { PrismaService } from '../../database/prisma.service';

// Domain services (core-platform)
import { FinancialLedgerService } from '@saas/core-platform';
import { StudentCreditService } from '@saas/core-platform';
import { InvoiceService } from '@saas/core-platform';
import { PaymentAllocationService } from '@saas/core-platform';
import { PaymentProcessingService } from '@saas/core-platform';
import { TransferService } from '@saas/core-platform';
import { RefundService } from '@saas/core-platform';
import {
  PaystackWebhookService,
  FlutterwaveWebhookService,
} from '@saas/core-platform';
import { ReconciliationService } from '@saas/core-platform';
import { FinancialReportingReadService } from '@saas/core-platform';
import { FinanceIntegrityVerificationService } from '@saas/core-platform';

// Controllers
import { FinanceAdminController } from './controllers/admin.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { PaymentController } from './controllers/payment.controller';
import { WebhookController } from './controllers/webhook.controller';
import { ReportController } from './controllers/report.controller';

import { FinanceReporter } from '@saas/core-platform';
import { ReportingModule, MetricRegistry } from '@saas/core-platform';

/**
 * FinanceModule — wires domain services, controllers, and the gateway webhook
 * handlers. No controller may write journal entries directly; all financial
 * mutations go through domain services which call FinancialLedgerService.
 */
@Module({
  imports: [CorePlatformModule, ReportingModule],
  controllers: [
    FinanceAdminController,
    InvoiceController,
    PaymentController,
    WebhookController,
    ReportController,
  ],
  providers: [
    // Core ledger engine — certified 15.1A
    FinancialLedgerService,
    StudentCreditService,

    // Invoice lifecycle
    {
      provide: InvoiceService,
      useFactory: (prisma: PrismaService, ledger: FinancialLedgerService) =>
        new InvoiceService(prisma as any, ledger),
      inject: [PrismaService, FinancialLedgerService],
    },

    // Payment allocation (depends on InvoiceService for syncInvoicePaymentStatus)
    {
      provide: PaymentAllocationService,
      useFactory: (
        prisma: PrismaService,
        ledger: FinancialLedgerService,
        invoice: InvoiceService,
      ) => new PaymentAllocationService(prisma as any, ledger, invoice),
      inject: [PrismaService, FinancialLedgerService, InvoiceService],
    },

    // Payment processing (depends on PaymentAllocationService + LedgerService)
    {
      provide: PaymentProcessingService,
      useFactory: (
        prisma: PrismaService,
        alloc: PaymentAllocationService,
        ledger: FinancialLedgerService,
      ) => new PaymentProcessingService(prisma as any, alloc, ledger),
      inject: [PrismaService, PaymentAllocationService, FinancialLedgerService],
    },

    // Transfer / settlement
    {
      provide: TransferService,
      useFactory: (prisma: PrismaService, ledger: FinancialLedgerService) =>
        new TransferService(prisma as any, ledger),
      inject: [PrismaService, FinancialLedgerService],
    },

    // Refund
    {
      provide: RefundService,
      useFactory: (prisma: PrismaService, ledger: FinancialLedgerService) =>
        new RefundService(prisma as any, ledger),
      inject: [PrismaService, FinancialLedgerService],
    },

    // Gateway webhook handlers (secrets from env vars)
    {
      provide: PaystackWebhookService,
      useFactory: (payment: PaymentProcessingService) =>
        new PaystackWebhookService(payment),
      inject: [PaymentProcessingService],
    },
    {
      provide: FlutterwaveWebhookService,
      useFactory: (payment: PaymentProcessingService) =>
        new FlutterwaveWebhookService(payment),
      inject: [PaymentProcessingService],
    },

    // Reconciliation
    {
      provide: ReconciliationService,
      useFactory: (prisma: PrismaService, ledger: FinancialLedgerService) =>
        new ReconciliationService(prisma as any, ledger),
      inject: [PrismaService, FinancialLedgerService],
    },

    // Reporting (read-only)
    {
      provide: FinancialReportingReadService,
      useFactory: (prisma: PrismaService) =>
        new FinancialReportingReadService(prisma as any),
      inject: [PrismaService],
    },

    // Integrity verification
    {
      provide: FinanceIntegrityVerificationService,
      useFactory: (prisma: PrismaService) =>
        new FinanceIntegrityVerificationService(prisma as any),
      inject: [PrismaService],
    },
    
    // Finance Metric Reporter
    {
      provide: FinanceReporter,
      useFactory: (prisma: PrismaService, metricRegistry: MetricRegistry) =>
        new FinanceReporter(prisma as any, metricRegistry),
      inject: [PrismaService, MetricRegistry],
    },
  ],
  exports: [
    FinancialLedgerService,
    StudentCreditService,
    InvoiceService,
    PaymentProcessingService,
    PaymentAllocationService,
    FinancialReportingReadService,
    FinanceIntegrityVerificationService,
    FinanceReporter,
  ],
})
export class FinanceModule {}
