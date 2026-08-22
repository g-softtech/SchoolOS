import { PrismaClient, Prisma, TransactionType, TransactionStatus } from '../../../../prisma/generated/client';
import {
  LedgerImbalanceError,
  ImmutableRecordError,
  PeriodLockedError,
  NoPeriodFoundError,
  DuplicateTransactionError,
  InvalidJournalLineError,
  TenantMismatchError,
} from './errors';

export interface LedgerLineEntry {
  accountId: string;
  /** Debit amount — must be >= 0. Cannot be > 0 if credit > 0. */
  debit: Prisma.Decimal;
  /** Credit amount — must be >= 0. Cannot be > 0 if debit > 0. */
  credit: Prisma.Decimal;
  memo?: string;
  /** Optional dimension: trace this line to a specific student */
  dimensionStudentId?: string;
  /** Optional dimension: trace this line to a specific invoice */
  dimensionInvoiceId?: string;
}

export interface TransactionPayload {
  tenantId: string;
  /** Globally unique reference within tenant. Used for idempotency. */
  reference: string;
  type: TransactionType;
  source: string;
  description?: string;
  transactionDate: Date;
  lines: LedgerLineEntry[];
}

export interface PostedTransaction {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  periodId: string;
  lines: Array<{
    id: string;
    accountId: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    memo: string | null;
    dimensionStudentId: string | null;
    dimensionInvoiceId: string | null;
  }>;
}

/**
 * FinancialLedgerService — the authoritative double-entry accounting engine.
 *
 * Invariants enforced by this service:
 * 1. Every transaction must have SUM(debit) === SUM(credit) before commit.
 * 2. No line may have both debit > 0 and credit > 0.
 * 3. No line may have both debit === 0 and credit === 0.
 * 4. No line may have debit < 0 or credit < 0.
 * 5. Posting to a CLOSED period is rejected.
 * 6. Duplicate references (per tenant) are rejected — idempotent by unique constraint.
 * 7. Transactions and journal lines are append-only (no UPDATE/DELETE exposed).
 * 8. Reversal creates a mirror transaction; the original is preserved.
 */
export class FinancialLedgerService {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Core: record a validated, balanced double-entry transaction
  // ---------------------------------------------------------------------------

  async recordTransaction(
    payload: TransactionPayload,
    txClient?: Prisma.TransactionClient,
  ): Promise<PostedTransaction> {
    const client = txClient ?? this.prisma;

    // --- Pre-commit validation (before touching the DB) ---
    this.validateLines(payload.lines);

    const totalDebits = payload.lines.reduce(
      (sum, l) => sum.plus(l.debit),
      new Prisma.Decimal(0),
    );
    const totalCredits = payload.lines.reduce(
      (sum, l) => sum.plus(l.credit),
      new Prisma.Decimal(0),
    );

    if (!totalDebits.equals(totalCredits)) {
      throw new LedgerImbalanceError(
        `Transaction imbalanced: Debits(${totalDebits}) != Credits(${totalCredits})`,
      );
    }

    // --- Database transaction: resolve period, enforce idempotency, persist ---
    const post = async (tx: Prisma.TransactionClient): Promise<PostedTransaction> => {
      // 1. Resolve accounting period
      const period = await tx.accountingPeriod.findFirst({
        where: {
          tenantId: payload.tenantId,
          startDate: { lte: payload.transactionDate },
          endDate: { gte: payload.transactionDate },
          status: 'OPEN',
        },
      });

      if (!period) {
        // Check if period exists but is closed
        const closedPeriod = await tx.accountingPeriod.findFirst({
          where: {
            tenantId: payload.tenantId,
            startDate: { lte: payload.transactionDate },
            endDate: { gte: payload.transactionDate },
          },
        });
        if (closedPeriod) {
          throw new PeriodLockedError(
            `Cannot post to CLOSED period "${closedPeriod.name}". Create a new period or reopen this one.`,
          );
        }
        throw new NoPeriodFoundError(
          `No accounting period found covering ${payload.transactionDate.toISOString()} for tenant ${payload.tenantId}`,
        );
      }

      // 2. Idempotency: the @@unique([tenantId, reference]) constraint handles concurrent
      //    duplicate requests at the DB level. We also do an optimistic check for a cleaner error.
      const existing = await tx.financialTransaction.findFirst({
        where: { tenantId: payload.tenantId, reference: payload.reference },
      });
      if (existing) {
        throw new DuplicateTransactionError(
          `Transaction reference "${payload.reference}" already exists for tenant ${payload.tenantId}`,
        );
      }

      // 3. Create transaction + lines atomically
      const transaction = await tx.financialTransaction.create({
        data: {
          tenantId: payload.tenantId,
          periodId: period.id,
          reference: payload.reference,
          type: payload.type,
          source: payload.source,
          description: payload.description,
          transactionDate: payload.transactionDate,
          status: 'POSTED',
          lines: {
            create: payload.lines.map((line) => ({
              tenantId: payload.tenantId,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo ?? null,
              dimensionStudentId: line.dimensionStudentId ?? null,
              dimensionInvoiceId: line.dimensionInvoiceId ?? null,
            })),
          },
        },
        include: { lines: true },
      });

      return transaction as unknown as PostedTransaction;
    };

    // If caller passed a tx client (already inside a transaction), use it directly.
    // Otherwise wrap in a new transaction.
    if (txClient) {
      return post(txClient as Prisma.TransactionClient);
    }
    return this.prisma.$transaction(post);
  }

  // ---------------------------------------------------------------------------
  // Reversal: creates an exact mirror of a posted transaction
  // ---------------------------------------------------------------------------

  async reverseTransaction(params: {
    tenantId: string;
    originalReference: string;
    reversalReference: string;
    description?: string;
    reversalDate: Date;
  }): Promise<PostedTransaction> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch the original transaction (must belong to the same tenant)
      const original = await tx.financialTransaction.findFirst({
        where: {
          tenantId: params.tenantId,
          reference: params.originalReference,
        },
        include: { lines: true },
      });

      if (!original) {
        throw new ImmutableRecordError(
          `Original transaction "${params.originalReference}" not found.`,
        );
      }
      if (original.status === 'VOIDED') {
        throw new ImmutableRecordError(
          `Transaction "${params.originalReference}" is already VOIDED.`,
        );
      }

      // 2. Build reversed lines (swap debit/credit)
      const reversalLines: LedgerLineEntry[] = original.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.credit,
        credit: line.debit,
        memo: `REVERSAL: ${line.memo ?? ''}`,
        dimensionStudentId: line.dimensionStudentId ?? undefined,
        dimensionInvoiceId: line.dimensionInvoiceId ?? undefined,
      }));

      // 3. Post the reversal transaction
      const reversal = await this.recordTransaction(
        {
          tenantId: params.tenantId,
          reference: params.reversalReference,
          type: 'REVERSAL',
          source: 'SYSTEM',
          description: params.description ?? `Reversal of ${params.originalReference}`,
          transactionDate: params.reversalDate,
          lines: reversalLines,
        },
        tx,
      );

      // 4. Mark original as VOIDED (preserving it — no deletion)
      await tx.financialTransaction.update({
        where: { id: original.id },
        data: { status: 'VOIDED' },
      });

      return reversal;
    });
  }

  // ---------------------------------------------------------------------------
  // Queries: ledger balances (always dynamic — never from a mutable balance field)
  // ---------------------------------------------------------------------------

  /**
   * Returns the natural balance of an account.
   * For ASSET/EXPENSE accounts: natural balance = SUM(debit) - SUM(credit)  [debit-normal]
   * For LIABILITY/EQUITY/REVENUE:                SUM(credit) - SUM(debit)   [credit-normal]
   */
  async getAccountBalance(
    tenantId: string,
    accountId: string,
    asOfDate?: Date,
  ): Promise<Prisma.Decimal> {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!account) throw new TenantMismatchError(`Account ${accountId} not found for tenant ${tenantId}`);

    // Include both POSTED and VOIDED lines — a voided transaction paired with its
    // reversal must both appear so they net to zero correctly.
    const whereClause: Prisma.JournalEntryLineWhereInput = {
      tenantId,
      accountId,
      ...(asOfDate ? { transaction: { transactionDate: { lte: asOfDate } } } : {}),
    };

    const result = await this.prisma.journalEntryLine.aggregate({
      where: whereClause,
      _sum: { debit: true, credit: true },
    });

    const debits = result._sum.debit ?? new Prisma.Decimal(0);
    const credits = result._sum.credit ?? new Prisma.Decimal(0);

    // Debit-normal accounts: ASSET, EXPENSE
    const debitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';
    return debitNormal ? debits.minus(credits) : credits.minus(debits);
  }

  /**
   * Computes the trial balance for a tenant.
   * In a correct double-entry system this MUST always equal zero.
   */
  async getTrialBalance(
    tenantId: string,
    asOfDate?: Date,
  ): Promise<{ totalDebits: Prisma.Decimal; totalCredits: Prisma.Decimal; isBalanced: boolean }> {
    // Include both POSTED and VOIDED — reversals net the voided entry to zero.
    const whereClause: Prisma.JournalEntryLineWhereInput = {
      tenantId,
      ...(asOfDate ? { transaction: { transactionDate: { lte: asOfDate } } } : {}),
    };

    const result = await this.prisma.journalEntryLine.aggregate({
      where: whereClause,
      _sum: { debit: true, credit: true },
    });

    const totalDebits = result._sum.debit ?? new Prisma.Decimal(0);
    const totalCredits = result._sum.credit ?? new Prisma.Decimal(0);

    return {
      totalDebits,
      totalCredits,
      isBalanced: totalDebits.equals(totalCredits),
    };
  }

  /**
   * Returns the ledger history for an account with a running balance.
   * Useful for financial statements and audit trails.
   */
  async getAccountLedger(
    tenantId: string,
    accountId: string,
  ): Promise<{
    currentBalance: string;
    history: Array<{
      date: Date;
      reference: string;
      description: string | null;
      memo: string | null;
      debit: string;
      credit: string;
      runningBalance: string;
    }>;
  }> {
    if (!(await this.prisma.chartOfAccount.findFirst({ where: { id: accountId, tenantId } }))) {
      throw new TenantMismatchError(`Account ${accountId} not found for tenant ${tenantId}`);
    }

    const lines = await this.prisma.journalEntryLine.findMany({
      where: { tenantId, accountId }, // Include VOIDED — reversal pair nets to zero
      include: {
        transaction: { select: { transactionDate: true, reference: true, description: true } },
      },
      orderBy: [{ transaction: { transactionDate: 'asc' } }, { createdAt: 'asc' }],
    });

    let runningBalance = new Prisma.Decimal(0);
    const history = lines.map((line) => {
      runningBalance = runningBalance.plus(line.debit).minus(line.credit);
      return {
        date: line.transaction.transactionDate,
        reference: line.transaction.reference,
        description: line.transaction.description,
        memo: line.memo,
        debit: line.debit.toString(),
        credit: line.credit.toString(),
        runningBalance: runningBalance.toString(),
      };
    });

    return { currentBalance: runningBalance.toString(), history };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private validateLines(lines: LedgerLineEntry[]): void {
    if (lines.length < 2) {
      throw new InvalidJournalLineError('A transaction must have at least 2 journal lines.');
    }

    for (const line of lines) {
      if (line.debit.lessThan(0)) {
        throw new InvalidJournalLineError(`Debit cannot be negative: ${line.debit}`);
      }
      if (line.credit.lessThan(0)) {
        throw new InvalidJournalLineError(`Credit cannot be negative: ${line.credit}`);
      }
      if (line.debit.greaterThan(0) && line.credit.greaterThan(0)) {
        throw new InvalidJournalLineError(
          `A line cannot have both debit (${line.debit}) and credit (${line.credit}) > 0.`,
        );
      }
      if (line.debit.equals(0) && line.credit.equals(0)) {
        throw new InvalidJournalLineError('A journal line must have either a debit or a credit amount > 0.');
      }
    }
  }
}
