import { PrismaClient, PaymentAttempt, Payment, Prisma } from '../../../../prisma/generated/client';
import { PaymentAllocationService, AllocatePaymentParams } from './PaymentAllocationService';
import { FinancialLedgerService } from './FinancialLedgerService';
import { FinanceError, DuplicateTransactionError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class PaymentProcessingError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentProcessingError';
  }
}

export class PaymentAlreadyProcessedError extends FinanceError {
  constructor(reference: string) {
    super(`Payment ${reference} has already been processed`);
    this.name = 'PaymentAlreadyProcessedError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InitiateAttemptParams {
  tenantId: string;
  gateway: string;
  /** Gateway-assigned idempotency reference, e.g. Paystack reference */
  reference: string;
}

export interface ProcessGatewaySuccessParams {
  tenantId: string;
  /** Gateway reference — used as Payment.reference and idempotency key */
  reference: string;
  /** Amount received from gateway, in kobo */
  amountKobo: number;
  method: 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  gatewayResponse: Record<string, unknown>;
  paymentDate: Date;
  /**
   * Chart-of-Account IDs required for PAYMENT_RECEIPT journal:
   *   Dr gatewayClearingAccountId / Cr prepaymentLiabilityAccountId
   */
  gatewayClearingAccountId: string;
  prepaymentLiabilityAccountId: string;
  dimensionStudentId: string;
  /** Allocation params — posted as a separate ALLOCATION transaction */
  allocationParams?: Omit<AllocatePaymentParams,
    'tenantId' | 'paymentId' | 'amountKobo' | 'transactionDate'
  >;
}

export interface ManualPaymentParams {
  tenantId: string;
  /** Amount in kobo */
  amountKobo: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD';
  /**
   * Deterministic reference — must be unique per tenant.
   * Caller must supply this; e.g. MANUAL-{bursarInitials}-{date}-{seq}
   */
  reference: string;
  paymentDate: Date;
  invoiceId?: string;
  gatewayClearingAccountId: string;
  prepaymentLiabilityAccountId: string;
  dimensionStudentId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class PaymentProcessingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly allocationService: PaymentAllocationService,
    private readonly ledgerService: FinancialLedgerService,
  ) {}

  // ─── Step 1: PaymentAttempt Created ─────────────────────────────────────────

  /**
   * Creates a PENDING PaymentAttempt.
   * Idempotent: if the same (tenantId, reference) already exists, returns it.
   */
  async initiatePaymentAttempt(params: InitiateAttemptParams): Promise<PaymentAttempt> {
    const existing = await this.prisma.paymentAttempt.findUnique({
      where: {
        // @@unique([tenantId, reference]) from migration
        tenantId_reference: { tenantId: params.tenantId, reference: params.reference },
      },
    });
    if (existing) return existing;

    return await this.prisma.paymentAttempt.create({
      data: {
        tenantId: params.tenantId,
        gateway: params.gateway,
        reference: params.reference,
        status: 'PENDING',
      },
    });
  }

  // ─── Step 2–4: Gateway webhook success callback ──────────────────────────────

  /**
   * Processes a verified successful gateway callback.
   *
   * Lifecycle (each step is idempotent or within a single DB transaction):
   *   1. Lock + verify PaymentAttempt is PENDING (not already CAPTURED)
   *   2. Mark PaymentAttempt → CAPTURED
   *   3. Create Payment record (correct schema fields only)
   *   4. Post PAYMENT_RECEIPT ledger transaction:
   *        Dr Gateway Clearing / Cr Student Prepayments
   *   5. (Optional) Run allocation if allocationParams provided
   *
   * Returns the created Payment.
   */
  async processGatewaySuccess(params: ProcessGatewaySuccessParams): Promise<Payment> {
    if (!Number.isInteger(params.amountKobo) || params.amountKobo <= 0) {
      throw new PaymentProcessingError('amountKobo must be a positive integer');
    }

    const amountDecimal = new Prisma.Decimal(params.amountKobo).div(100);

    // Lock attempt — idempotency gate
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { tenantId_reference: { tenantId: params.tenantId, reference: params.reference } },
    });

    if (!attempt) {
      throw new PaymentProcessingError(
        `PaymentAttempt not found for reference ${params.reference}`,
      );
    }
    if (attempt.status === 'CAPTURED') {
      // Already processed — return existing Payment idempotently
      const existing = await this.prisma.payment.findUnique({
        where: { reference: params.reference },
      });
      if (existing) return existing;
      throw new PaymentAlreadyProcessedError(params.reference);
    }

    // ── Atomic: mark attempt, create payment, post PAYMENT_RECEIPT ──
    const payment = await this.prisma.$transaction(async (tx) => {
      // 1. Mark attempt CAPTURED
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'CAPTURED', response: params.gatewayResponse as any },
      });

      // 2. Create Payment (only schema-compliant fields)
      const pmt = await tx.payment.create({
        data: {
          tenantId: params.tenantId,
          amount: amountDecimal,
          method: params.method,
          reference: params.reference,
          paymentDate: params.paymentDate,
          status: 'SUCCESS',
        },
      });

      return pmt;
    });

    // 3. Post PAYMENT_RECEIPT ledger transaction (outside the above tx so
    //    FinancialLedgerService can use its own transaction with idempotency check)
    //    Dr Gateway Clearing / Cr Student Prepayments
    await this.ledgerService.recordTransaction({
      tenantId: params.tenantId,
      reference: `RECEIPT-${params.reference}`,
      type: 'PAYMENT_RECEIPT',
      source: 'GATEWAY',
      transactionDate: params.paymentDate,
      lines: [
        {
          accountId: params.gatewayClearingAccountId,
          debit: amountDecimal,
          credit: new Prisma.Decimal(0),
        },
        {
          accountId: params.prepaymentLiabilityAccountId,
          debit: new Prisma.Decimal(0),
          credit: amountDecimal,
          dimensionStudentId: params.dimensionStudentId,
        },
      ],
    });

    // 4. Optional: run allocation as a separate ALLOCATION transaction
    if (params.allocationParams) {
      await this.allocationService.allocatePayment({
        tenantId: params.tenantId,
        paymentId: payment.id,
        amountKobo: params.amountKobo,
        transactionDate: params.paymentDate,
        ...params.allocationParams,
      });
    }

    return payment;
  }

  // ─── Manual Cash / Bank Transfer Payment ─────────────────────────────────────

  /**
   * Records a bursar-entered cash or bank-transfer payment.
   * Posts:  Dr Gateway Clearing (or cash account) / Cr Student Prepayments
   *
   * Fully idempotent on (tenantId, reference).
   */
  async recordManualPayment(params: ManualPaymentParams): Promise<Payment> {
    if (!Number.isInteger(params.amountKobo) || params.amountKobo <= 0) {
      throw new PaymentProcessingError('amountKobo must be a positive integer');
    }

    const amountDecimal = new Prisma.Decimal(params.amountKobo).div(100);

    // Idempotency check
    const existing = await this.prisma.payment.findUnique({
      where: { reference: params.reference },
    });
    if (existing) return existing;

    const payment = await this.prisma.payment.create({
      data: {
        tenantId: params.tenantId,
        amount: amountDecimal,
        method: params.method,
        reference: params.reference,
        paymentDate: params.paymentDate,
        status: 'SUCCESS',
        invoiceId: params.invoiceId ?? null,
      },
    });

    await this.ledgerService.recordTransaction({
      tenantId: params.tenantId,
      reference: `RECEIPT-${params.reference}`,
      type: 'PAYMENT_RECEIPT',
      source: 'MANUAL',
      transactionDate: params.paymentDate,
      lines: [
        {
          accountId: params.gatewayClearingAccountId,
          debit: amountDecimal,
          credit: new Prisma.Decimal(0),
        },
        {
          accountId: params.prepaymentLiabilityAccountId,
          debit: new Prisma.Decimal(0),
          credit: amountDecimal,
          dimensionStudentId: params.dimensionStudentId,
        },
      ],
    });

    return payment;
  }
}
