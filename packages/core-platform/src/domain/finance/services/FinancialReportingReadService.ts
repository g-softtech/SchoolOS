import { PrismaClient } from '../../../../prisma/generated/client';

export interface ExplanationLine {
  label: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT' | 'BALANCE';
}

export class FinancialReportingReadService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generates a completely explainable, zero-math breakdown for a student's balance.
   * Traverses: Balance -> Allocations -> Payments -> Invoices -> Fee Structure
   */
  async explainBalanceComplete(params: {
    tenantId: string;
    accountId: string;
  }): Promise<{ lines: ExplanationLine[]; totalOutstanding: number }> {
    // 1. Fetch all Invoices for the account
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId: params.tenantId, accountId: params.accountId },
      include: {
        items: {
          include: {
            allocations: {
              include: {
                payment: {
                  include: { receipt: true }
                }
              }
            }
          }
        }
      }
    });

    const breakdown: ExplanationLine[] = [];
    let totalOutstanding = 0;

    for (const invoice of invoices) {
      breakdown.push({ label: `--- Invoice: ${invoice.id} ---`, amount: 0, type: 'BALANCE' });

      for (const item of invoice.items) {
        // Add the billed amount
        breakdown.push({ label: `${item.description}`, amount: Number(item.amount), type: 'DEBIT' });
        
        // Subtract allocations (Payments)
        let itemPaid = 0;
        for (const alloc of item.allocations) {
          const receiptLabel = alloc.payment?.receipt ? ` (Receipt: ${alloc.payment.receipt.receiptNumber})` : '';
          breakdown.push({ 
            label: `  Paid${receiptLabel}`, 
            amount: -Number(alloc.amount), 
            type: 'CREDIT' 
          });
          itemPaid += Number(alloc.amount);
        }

        const remaining = Number(item.amount) - itemPaid;
        if (remaining > 0) {
          breakdown.push({ label: `  Remaining`, amount: remaining, type: 'BALANCE' });
        } else {
          breakdown.push({ label: `  Fully Paid ✔`, amount: 0, type: 'BALANCE' });
        }

        totalOutstanding += remaining;
      }
    }

    breakdown.push({ label: '====================', amount: 0, type: 'BALANCE' });
    breakdown.push({ label: 'TOTAL OUTSTANDING', amount: totalOutstanding, type: 'BALANCE' });

    return { lines: breakdown, totalOutstanding };
  }

  /**
   * Optimized read model for the general ledger trial balance.
   * Never mutates records.
   */
  async getTrialBalance(params: {
    tenantId: string;
    periodId: string;
  }): Promise<Array<{ accountCode: string; name: string; debitBalance: number; creditBalance: number }>> {
    // Queries JournalEntryLines grouped by accountId for a specific period
    const lines = await this.prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      where: { tenantId: params.tenantId, entry: { periodId: params.periodId } },
      _sum: { debit: true, credit: true }
    });

    const accounts = await this.prisma.gLAccount.findMany({
      where: { id: { in: lines.map(l => l.accountId) } }
    });

    return lines.map(line => {
      const acc = accounts.find(a => a.id === line.accountId);
      return {
        accountCode: acc?.code || 'UNKNOWN',
        name: acc?.name || 'UNKNOWN',
        debitBalance: Number(line._sum.debit) || 0,
        creditBalance: Number(line._sum.credit) || 0,
      };
    });
  }
}
