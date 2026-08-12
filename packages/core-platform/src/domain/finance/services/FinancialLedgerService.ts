import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import {
  LedgerImbalanceError,
  ImmutableRecordError,
  PeriodLockedError,
  DuplicateTransactionError,
} from './errors';

export interface LedgerLineEntry {
  accountId: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  memo?: string;
}

export interface TransactionPayload {
  tenantId: string;
  transactionRef: string;
  type: string; // e.g. INVOICE, PAYMENT
  source: string;
  description?: string;
  date: Date;
  lines: LedgerLineEntry[];
}

export class FinancialLedgerService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Records a strictly balanced double-entry transaction.
   * Enforces immutability, balancing, and period locking.
   */
  async recordTransaction(payload: TransactionPayload): Promise<any> {
    // 1. Verify Trial Balance (Debits == Credits)
    const totalDebits = payload.lines.reduce((sum, line) => sum.plus(line.debit), new Prisma.Decimal(0));
    const totalCredits = payload.lines.reduce((sum, line) => sum.plus(line.credit), new Prisma.Decimal(0));

    if (!totalDebits.equals(totalCredits)) {
      throw new LedgerImbalanceError(`Transaction imbalanced: Debits(${totalDebits.toString()}) != Credits(${totalCredits.toString()})`);
    }

    // Use a strict interactive transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      // 2. Idempotency Check (Duplicate Webhook Protection)
      const existingTxn = await tx.financialTransaction.findFirst({
        where: {
          tenantId: payload.tenantId,
          transactionRef: payload.transactionRef,
        },
      });

      if (existingTxn) {
        throw new DuplicateTransactionError(`Transaction ${payload.transactionRef} already exists.`);
      }

      // 3. Resolve Accounting Period & Lock Check
      const period = await tx.accountingPeriod.findFirst({
        where: {
          tenantId: payload.tenantId,
          startDate: { lte: payload.date },
          endDate: { gte: payload.date },
        },
      });

      if (!period) {
        throw new Error('No valid accounting period found for transaction date.');
      }

      if (period.status === 'LOCKED' || period.status === 'CLOSED') {
        throw new PeriodLockedError(`Cannot post to ${period.status} period ${period.name}`);
      }

      // 4. Create FinancialTransaction
      const transaction = await tx.financialTransaction.create({
        data: {
          tenantId: payload.tenantId,
          transactionRef: payload.transactionRef,
          type: payload.type,
          source: payload.source,
          description: payload.description,
          status: 'COMPLETED',
        },
      });

      // 5. Create JournalEntry and Lines
      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: payload.tenantId,
          periodId: period.id,
          date: payload.date,
          reference: payload.transactionRef,
          status: 'POSTED',
          lines: {
            create: payload.lines.map((line) => ({
              tenantId: payload.tenantId,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo,
            })),
          },
        },
        include: { lines: true },
      });

      return { transaction, journalEntry };
    });
  }

  /**
   * Dynamically derives the historical balance of an account based purely on the sum of debits/credits.
   */
  async getAccountBalance(tenantId: string, accountId: string, asOfDate?: Date): Promise<Prisma.Decimal> {
    const whereClause: any = {
      tenantId,
      accountId,
    };

    if (asOfDate) {
      whereClause.entry = {
        date: {
          lte: asOfDate,
        },
      };
    }

    const result = await this.prisma.journalEntryLine.aggregate({
      where: whereClause,
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const debits = result._sum.debit || new Prisma.Decimal(0);
    const credits = result._sum.credit || new Prisma.Decimal(0);

    // Depending on account type (Asset vs Liability), the natural balance differs.
    // For simplicity in this base ledger, we return Debits - Credits.
    // The consumer (e.g. Accounts Receivable) knows A/R is an Asset (Debit normal).
    return debits.minus(credits);
  }

  /**
   * Reconstructs the balance logic into an explainable chain of events.
   */
  async explainBalance(tenantId: string, accountId: string): Promise<any> {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: { tenantId, accountId },
      include: {
        entry: {
          select: {
            date: true,
            reference: true,
            memo: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    let runningBalance = new Prisma.Decimal(0);
    const explanation = lines.map(line => {
      runningBalance = runningBalance.plus(line.debit).minus(line.credit);
      return {
        date: line.entry.date,
        reference: line.entry.reference,
        memo: line.memo,
        debit: line.debit,
        credit: line.credit,
        runningBalance: runningBalance.toString()
      };
    });

    return {
      currentBalance: runningBalance.toString(),
      history: explanation
    };
  }
}
