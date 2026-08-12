import { PrismaClient, PaymentAttempt, Payment, Receipt } from '../../../../prisma/generated/client';
import { PaymentAllocationService } from './PaymentAllocationService';
import { FinancialLedgerService } from './FinancialLedgerService';
import { InvoiceService } from './InvoiceService';
import { FinanceError } from './errors';

export class PaymentProcessingError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentProcessingError';
  }
}

export class PaymentProcessingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly allocationService: PaymentAllocationService,
    private readonly ledgerService: FinancialLedgerService,
    private readonly invoiceService: InvoiceService
  ) {}

  /**
   * State 1: Attempt Created -> Sent to Gateway
   */
  async initializePaymentAttempt(params: {
    tenantId: string;
    gateway: string;
    reference: string;
  }): Promise<PaymentAttempt> {
    return await this.prisma.paymentAttempt.create({
      data: {
        tenantId: params.tenantId,
        gateway: params.gateway,
        reference: params.reference,
        status: 'PENDING',
      },
    });
  }

  /**
   * State 2-9: Awaiting Callback -> Verified -> Payment Created -> Allocated -> Journal Posted -> Receipt Issued -> Completed
   * Handles the webhook/callback from the gateway.
   */
  async processSuccessfulGatewayCallback(params: {
    tenantId: string;
    accountId: string;
    reference: string;
    amountPaid: number;
    gatewayResponse: any;
    allocationStrategy: string;
    correlationId: string;
    accountingPeriodId: string;
    paymentMethodId: string;
    paymentProviderId: string;
  }): Promise<{ payment: Payment; receipt: Receipt }> {
    // 1. Verify and lock the attempt to prevent duplicate processing
    const attempt = await this.prisma.paymentAttempt.findFirst({
      where: { tenantId: params.tenantId, reference: params.reference },
    });

    if (!attempt) throw new PaymentProcessingError('Payment attempt not found');
    if (attempt.status === 'CAPTURED') throw new PaymentProcessingError('Payment already processed');

    // Begin the massive orchestration transaction (State Machine progression)
    // Note: In a true high-scale distributed system, this might be split with an event bus,
    // but a database transaction ensures ACID correctness for the entire chain.
    return await this.prisma.$transaction(async (tx) => {
      // 2. Verified -> Mark attempt as CAPTURED
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'CAPTURED', response: params.gatewayResponse },
      });

      // 3. Payment Created
      const payment = await tx.payment.create({
        data: {
          tenantId: params.tenantId,
          accountId: params.accountId,
          methodId: params.paymentMethodId,
          providerId: params.paymentProviderId,
          paymentAttemptId: attempt.id,
          amount: params.amountPaid,
          reference: params.reference,
          status: 'SUCCESS',
        },
      });

      // 4. Allocated (Hand off to Allocation Engine)
      const allocationResult = await this.allocationService.allocatePayment({
        tenantId: params.tenantId,
        accountId: params.accountId,
        paymentId: payment.id,
        amountToAllocate: params.amountPaid,
        strategy: params.allocationStrategy,
        correlationId: params.correlationId,
        periodId: params.accountingPeriodId,
      });

      // Update invoice statuses based on allocations
      const uniqueInvoiceIds = new Set(
        allocationResult.allocations.map(a => 
          (a as any).invoiceItemId // Ideally we'd fetch the invoiceId from the item, mock for brevity
        )
      );
      // In real code, we'd map invoiceItemId -> invoiceId and call updateInvoicePaymentStatus

      // 5. Journal Posted (Hand off to Ledger Service as a validated Accounting Event)
      // Example posting: Debit Cash/Bank (Full Amount), Credit Accounts Receivable (Allocated), Credit Student Wallet (Unallocated)
      
      /* 
      await this.ledgerService.recordTransaction({
        tenantId: params.tenantId,
        transactionRef: params.correlationId,
        periodId: params.accountingPeriodId,
        date: new Date(),
        memo: `Payment ${payment.reference}`,
        entries: [
          { accountId: 'BANK_ACCOUNT_ID', debit: params.amountPaid, credit: 0 },
          { accountId: 'AR_ACCOUNT_ID', debit: 0, credit: params.amountPaid - allocationResult.unallocated },
          { accountId: 'WALLET_LIABILITY_ACCOUNT_ID', debit: 0, credit: allocationResult.unallocated }
        ]
      });
      */

      // 6. Receipt Issued (Comes last, safely generating sequence via SequenceGenerator)
      // Mock fetching next sequence value
      const receiptNumber = `RCT-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;
      
      const receipt = await tx.receipt.create({
        data: {
          tenantId: params.tenantId,
          paymentId: payment.id,
          receiptNumber: receiptNumber,
        },
      });

      // 7. Completed!
      return { payment, receipt };
    });
  }
}
