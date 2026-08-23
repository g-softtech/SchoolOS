import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { FinancialLedgerService } from './FinancialLedgerService';
import { FinanceError } from './errors';

/**
 * ReconciliationService — Phase 15.2 scope: ledger-level gateway reconciliation.
 *
 * Note: Full bank-statement import/match (BankStatement model, auto-matching)
 * is a future phase. Those models do not exist in the frozen schema.
 *
 * Phase 15.2 provides:
 *  1. Gateway clearing balance (money received but not yet settled to physical bank)
 *  2. Outstanding transfer check (gateway vs bank)
 *  3. Per-period reconciliation status based on ledger balances
 */
export class ReconciliationError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'ReconciliationError';
  }
}

export interface ReconciliationStatus {
  gatewayClearingBalanceKobo: number;
  mainBankBalanceKobo: number;
  /** Non-zero means funds received digitally but not yet settled to physical bank */
  unsettledKobo: number;
  isReconciled: boolean;
}

export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerService: FinancialLedgerService,
  ) {}

  /**
   * Returns reconciliation status for a tenant's gateway clearing account.
   *
   * Gateway Clearing balance should be 0 after all settlements are posted.
   * A non-zero balance means: money received from gateway but not yet settled
   * into the physical bank account in the ledger.
   */
  async getReconciliationStatus(params: {
    tenantId: string;
    gatewayClearingAccountId: string;
    bankAccountId: string;
  }): Promise<ReconciliationStatus> {
    const [clearingBalance, bankBalance] = await Promise.all([
      this.ledgerService.getAccountBalance(params.tenantId, params.gatewayClearingAccountId),
      this.ledgerService.getAccountBalance(params.tenantId, params.bankAccountId),
    ]);

    const clearingKobo = Math.round(clearingBalance.mul(100).toNumber());
    const bankKobo = Math.round(bankBalance.mul(100).toNumber());

    return {
      gatewayClearingBalanceKobo: clearingKobo,
      mainBankBalanceKobo: bankKobo,
      unsettledKobo: Math.max(0, clearingKobo),
      isReconciled: clearingKobo === 0,
    };
  }

  /**
   * Returns a list of all payment transactions for a given period
   * alongside their settlement status (i.e., whether the gateway clearing
   * was subsequently offset by a TRANSFER transaction).
   */
  async getPeriodReconciliationReport(params: {
    tenantId: string;
    periodId: string;
    gatewayClearingAccountId: string;
  }): Promise<{
    totalReceivedKobo: number;
    totalSettledKobo: number;
    unsettledKobo: number;
  }> {
    // Sum of all PAYMENT_RECEIPT debits to gateway clearing (money in)
    const receiptLines = await this.prisma.journalEntryLine.aggregate({
      where: {
        tenantId: params.tenantId,
        accountId: params.gatewayClearingAccountId,
        transaction: {
          periodId: params.periodId,
          type: 'PAYMENT_RECEIPT',
        },
      },
      _sum: { debit: true },
    });

    // Sum of all TRANSFER credits from gateway clearing (money out to bank)
    const transferLines = await this.prisma.journalEntryLine.aggregate({
      where: {
        tenantId: params.tenantId,
        accountId: params.gatewayClearingAccountId,
        transaction: {
          periodId: params.periodId,
          type: 'TRANSFER',
        },
      },
      _sum: { credit: true },
    });

    const totalReceivedKobo = Math.round(
      Number(receiptLines._sum.debit ?? 0) * 100,
    );
    const totalSettledKobo = Math.round(
      Number(transferLines._sum.credit ?? 0) * 100,
    );

    return {
      totalReceivedKobo,
      totalSettledKobo,
      unsettledKobo: Math.max(0, totalReceivedKobo - totalSettledKobo),
    };
  }
}
