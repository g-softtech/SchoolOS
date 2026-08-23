import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { FinancialLedgerService } from './FinancialLedgerService';
import { FinanceError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class TransferError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'TransferError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BankSettlementParams {
  tenantId: string;
  /** Deterministic reference, e.g. SETTLE-PAYSTACK-2026-00001 */
  reference: string;
  /** Amount being settled, in kobo */
  amountKobo: number;
  /** Gateway clearing account (source) */
  gatewayClearingAccountId: string;
  /** Physical bank account (destination) */
  bankAccountId: string;
  settlementDate: Date;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TransferService — posts bank settlement and inter-account transfer transactions.
 *
 * Bank settlement (Paystack → GTBank):
 *   Dr Main Bank (physical bank account)
 *   Cr Paystack Clearing (gateway clearing account)
 *
 * This reduces the gateway clearing balance to zero (reconciled) and moves
 * the money to the physical bank account in the ledger.
 *
 * After a chargeback/reversal: the gateway clears the amount back from the
 * physical bank, so the corresponding settlement must itself be reversed
 * (or a new contra-transfer posted) before the ledger reconciles.
 */
export class TransferService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerService: FinancialLedgerService,
  ) {}

  /**
   * Posts a bank settlement: money leaves Gateway Clearing → enters Main Bank.
   *
   * Idempotent: duplicate reference is rejected by @@unique constraint
   * on FinancialTransaction(tenantId, reference).
   */
  async postBankSettlement(params: BankSettlementParams): Promise<{ reference: string }> {
    if (!Number.isInteger(params.amountKobo) || params.amountKobo <= 0) {
      throw new TransferError('amountKobo must be a positive integer');
    }

    const amountDecimal = new Prisma.Decimal(params.amountKobo).div(100);

    await this.ledgerService.recordTransaction({
      tenantId: params.tenantId,
      reference: params.reference,
      type: 'TRANSFER',
      source: 'BANK',
      transactionDate: params.settlementDate,
      description: params.description,
      lines: [
        {
          accountId: params.bankAccountId,
          debit: amountDecimal,
          credit: new Prisma.Decimal(0),
        },
        {
          accountId: params.gatewayClearingAccountId,
          debit: new Prisma.Decimal(0),
          credit: amountDecimal,
        },
      ],
    });

    return { reference: params.reference };
  }

  /**
   * Returns the current balance of a gateway clearing account in kobo.
   * A non-zero balance means funds are received but not yet settled to the bank.
   */
  async getGatewayClearingBalance(tenantId: string, gatewayClearingAccountId: string): Promise<number> {
    const balance = await this.ledgerService.getAccountBalance(tenantId, gatewayClearingAccountId);
    return Math.round(balance.mul(100).toNumber());
  }
}
