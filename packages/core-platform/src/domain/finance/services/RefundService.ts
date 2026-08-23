import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { FinancialLedgerService } from './FinancialLedgerService';
import { FinanceError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class RefundError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'RefundError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PostRefundParams {
  tenantId: string;
  /** Deterministic reference, e.g. REF-{originalRef} */
  refundReference: string;
  /** Amount to refund, in kobo */
  amountKobo: number;
  /**
   * The student prepayment liability account (Dr — reducing school liability).
   * Refund reduces Student Prepayments (if student had credit).
   * Or use AR account if refunding an overpayment.
   */
  prepaymentLiabilityAccountId: string;
  /**
   * The bank/clearing account that the refund leaves from (Cr).
   * E.g. Main Bank for cash refund, Gateway Clearing for gateway reversal.
   */
  refundSourceAccountId: string;
  dimensionStudentId: string;
  refundDate: Date;
  description?: string;
}

export interface PostChargebackParams {
  tenantId: string;
  /**
   * Reference for the chargeback REVERSAL ledger transaction.
   * Convention: REV-RECEIPT-{originalGatewayRef}
   */
  chargebackReference: string;
  /** Original PAYMENT_RECEIPT reference to reverse */
  originalReceiptReference: string;
  chargebackDate: Date;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RefundService — posts refund and chargeback (reversal) transactions.
 *
 * All operations are append-only. Original transactions are never deleted
 * or mutated. Corrections always create new REFUND or REVERSAL transactions.
 *
 * Chargeback note (per architectural correction):
 * If the payment has already been settled to the bank, reversing the
 * PAYMENT_RECEIPT alone leaves Gateway Clearing in a negative state.
 * The caller MUST separately reverse or offset the TRANSFER (settlement)
 * using FinancialLedgerService.reverseTransaction on the settlement reference.
 * The E2E test documents the correct two-step sequence.
 */
export class RefundService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerService: FinancialLedgerService,
  ) {}

  /**
   * Posts a REFUND transaction.
   * Typically used for bursar-initiated cash refunds or partial credits.
   *
   * Journal:
   *   Dr Student Prepayments (reduces school liability to student)
   *   Cr Main Bank / Cash (money leaves the school)
   */
  async postRefund(params: PostRefundParams): Promise<{ reference: string }> {
    if (!Number.isInteger(params.amountKobo) || params.amountKobo <= 0) {
      throw new RefundError('amountKobo must be a positive integer');
    }

    const amountDecimal = new Prisma.Decimal(params.amountKobo).div(100);

    await this.ledgerService.recordTransaction({
      tenantId: params.tenantId,
      reference: params.refundReference,
      type: 'REFUND',
      source: 'MANUAL',
      transactionDate: params.refundDate,
      description: params.description ?? 'Refund',
      lines: [
        {
          accountId: params.prepaymentLiabilityAccountId,
          debit: amountDecimal,
          credit: new Prisma.Decimal(0),
          dimensionStudentId: params.dimensionStudentId,
        },
        {
          accountId: params.refundSourceAccountId,
          debit: new Prisma.Decimal(0),
          credit: amountDecimal,
        },
      ],
    });

    return { reference: params.refundReference };
  }

  /**
   * Processes a chargeback by reversing the original PAYMENT_RECEIPT transaction.
   *
   * This uses FinancialLedgerService.reverseTransaction which:
   *   - Creates a mirror REVERSAL transaction (swapped Dr/Cr)
   *   - Marks original as VOIDED
   *   - Both entries remain in the ledger for audit
   *
   * ⚠️  If the payment was already settled to the bank (TRANSFER posted),
   *     the caller must ALSO reverse the TRANSFER using:
   *     ledgerService.reverseTransaction({ originalReference: 'SETTLE-...' })
   *     Otherwise Gateway Clearing will show a negative balance.
   */
  async processChargeback(params: PostChargebackParams): Promise<{ reversalReference: string }> {
    await this.ledgerService.reverseTransaction({
      tenantId: params.tenantId,
      originalReference: params.originalReceiptReference,
      reversalReference: params.chargebackReference,
      reversalDate: params.chargebackDate,
      description: params.description ?? `Chargeback reversal of ${params.originalReceiptReference}`,
    });

    return { reversalReference: params.chargebackReference };
  }
}
