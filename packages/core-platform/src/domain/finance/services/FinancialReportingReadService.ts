import { PrismaClient, Prisma } from '../../../../prisma/generated/client';

export interface ExplanationLine {
  label: string;
  amountKobo: number;
  type: 'DEBIT' | 'CREDIT' | 'BALANCE';
}

export interface StudentBalanceExplanation {
  lines: ExplanationLine[];
  totalOutstandingKobo: number;
}

export interface TrialBalanceLine {
  accountCode: string;
  name: string;
  accountType: string;
  debitKobo: number;
  creditKobo: number;
}

/**
 * FinancialReportingReadService — read-only reporting queries.
 * All balances are ledger-derived. Never reads Invoice.amountPaid as truth.
 * Returns amounts in kobo.
 */
export class FinancialReportingReadService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Produces a complete explainable breakdown of a student's outstanding balance.
   * Traverses: Invoices → Items → PaymentAllocations (authoritative).
   * Does NOT use Invoice.amountPaid or InvoiceItem.amountPaid.
   */
  async explainStudentBalance(params: {
    tenantId: string;
    studentId: string;
  }): Promise<StudentBalanceExplanation> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId: params.tenantId,
        studentId: params.studentId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            PaymentAllocation: {
              include: { payment: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const lines: ExplanationLine[] = [];
    let totalOutstandingKobo = 0;

    for (const invoice of invoices) {
      lines.push({
        label: `── Invoice ${invoice.invoiceNumber} (${invoice.status}) ──`,
        amountKobo: 0,
        type: 'BALANCE',
      });

      for (const item of invoice.items) {
        const itemKobo = Math.round(Number(item.amount) * 100);
        lines.push({ label: item.description, amountKobo: itemKobo, type: 'DEBIT' });

        let itemAllocatedKobo = 0;
        for (const alloc of item.PaymentAllocation) {
          const allocKobo = Math.round(Number(alloc.amount) * 100);
          lines.push({
            label: `  Payment ref: ${alloc.payment?.reference ?? alloc.paymentId}`,
            amountKobo: allocKobo,
            type: 'CREDIT',
          });
          itemAllocatedKobo += allocKobo;
        }

        const remaining = Math.max(0, itemKobo - itemAllocatedKobo);
        if (remaining > 0) {
          lines.push({ label: `  Outstanding`, amountKobo: remaining, type: 'BALANCE' });
        } else {
          lines.push({ label: `  Fully paid ✔`, amountKobo: 0, type: 'BALANCE' });
        }
        totalOutstandingKobo += remaining;
      }
    }

    lines.push({ label: 'TOTAL OUTSTANDING', amountKobo: totalOutstandingKobo, type: 'BALANCE' });

    return { lines, totalOutstandingKobo };
  }

  /**
   * Returns a trial balance for a specific accounting period.
   * Derived entirely from JournalEntryLine aggregates.
   * Amounts returned in kobo.
   */
  async getTrialBalance(params: {
    tenantId: string;
    periodId?: string;
  }): Promise<{ lines: TrialBalanceLine[]; totalDebitKobo: number; totalCreditKobo: number; isBalanced: boolean }> {
    const where: Prisma.JournalEntryLineWhereInput = {
      tenantId: params.tenantId,
      ...(params.periodId
        ? { transaction: { periodId: params.periodId } }
        : {}),
    };

    const grouped = await this.prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      where,
      _sum: { debit: true, credit: true },
    });

    const accountIds = grouped.map((g) => g.accountId);
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds } },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let totalDebitKobo = 0;
    let totalCreditKobo = 0;

    const lines: TrialBalanceLine[] = grouped.map((line) => {
      const acc = accountMap.get(line.accountId);
      const debitKobo = Math.round(Number(line._sum.debit ?? 0) * 100);
      const creditKobo = Math.round(Number(line._sum.credit ?? 0) * 100);
      totalDebitKobo += debitKobo;
      totalCreditKobo += creditKobo;
      return {
        accountCode: acc?.code ?? 'UNKNOWN',
        name: acc?.name ?? 'UNKNOWN',
        accountType: acc?.type ?? 'UNKNOWN',
        debitKobo,
        creditKobo,
      };
    });

    return {
      lines,
      totalDebitKobo,
      totalCreditKobo,
      isBalanced: totalDebitKobo === totalCreditKobo,
    };
  }

  /**
   * Returns a summary of account balances across all ASSET, LIABILITY,
   * EQUITY, REVENUE and EXPENSE accounts for the tenant.
   * Derived from ledger only.
   */
  async getFinancialSummary(params: {
    tenantId: string;
    periodId?: string;
  }): Promise<{ accounts: Array<{ code: string; name: string; type: string; balanceKobo: number }> }> {
    const tb = await this.getTrialBalance(params);

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId: params.tenantId, isActive: true },
    });

    const lineMap = new Map(tb.lines.map((l) => [l.accountCode, l]));

    const result = accounts.map((acc) => {
      const line = lineMap.get(acc.code);
      const debit = line?.debitKobo ?? 0;
      const credit = line?.creditKobo ?? 0;
      // Debit-normal: ASSET, EXPENSE → balance = debit - credit
      // Credit-normal: LIABILITY, EQUITY, REVENUE → balance = credit - debit
      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(acc.type);
      const balanceKobo = isDebitNormal ? debit - credit : credit - debit;
      return { code: acc.code, name: acc.name, type: acc.type, balanceKobo };
    });

    return { accounts: result };
  }
}
