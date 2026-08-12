import { PrismaClient } from '../../../../prisma/generated/client';

export interface AuditReport {
  timestamp: Date;
  isHealthy: boolean;
  issues: Array<{
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    code: string;
    description: string;
    metadata?: any;
  }>;
}

export class FinanceIntegrityVerificationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Runs a complete internal audit of the Finance sub-system.
   * Scans for ledger imbalances, orphaned allocations, and broken explainability chains.
   */
  async runHealthAudit(tenantId: string): Promise<AuditReport> {
    const report: AuditReport = {
      timestamp: new Date(),
      isHealthy: true,
      issues: []
    };

    // 1. Ledger Imbalance Check (Sum(Debits) === Sum(Credits))
    const journalImbalances = await this.prisma.$queryRaw<any[]>`
      SELECT "entryId", SUM(debit) as totalDebit, SUM(credit) as totalCredit
      FROM "finance_journal_entry_lines"
      WHERE "tenantId" = ${tenantId}
      GROUP BY "entryId"
      HAVING SUM(debit) != SUM(credit)
    `;

    if (journalImbalances.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'LEDGER_IMBALANCE',
        description: `Found ${journalImbalances.length} journal entries where Debits do not equal Credits.`,
        metadata: { journalEntryIds: journalImbalances.map(j => j.entryId) }
      });
    }

    // 2. Orphaned Allocations Check (Allocations without a FinancialTransaction)
    const orphanedAllocations = await this.prisma.paymentAllocation.findMany({
      where: { tenantId, transactionId: null as any },
      select: { id: true }
    });

    if (orphanedAllocations.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'ORPHANED_ALLOCATIONS',
        description: `Found ${orphanedAllocations.length} allocations missing a parent FinancialTransaction.`,
        metadata: { allocationIds: orphanedAllocations.map(a => a.id) }
      });
    }

    // 3. Broken Invoice Explainability Check 
    // (Billed Amount < Paid Amount on an Invoice Item)
    const overpaidItems = await this.prisma.$queryRaw<any[]>`
      SELECT "id", "amount", "amountPaid"
      FROM "finance_invoice_items"
      WHERE "tenantId" = ${tenantId} AND "amountPaid" > "amount"
    `;

    if (overpaidItems.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'INVOICE_ITEM_OVERPAID',
        description: `Found ${overpaidItems.length} invoice items where AmountPaid exceeds Billed Amount. Allocations should route to Credit Wallet instead.`,
        metadata: { itemIds: overpaidItems.map(i => i.id) }
      });
    }

    // 4. Ghost Receipts Check (Receipts without valid Payments)
    const ghostReceipts = await this.prisma.receipt.findMany({
      where: { tenantId, payment: null as any },
      select: { id: true, receiptNumber: true }
    });

    if (ghostReceipts.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'GHOST_RECEIPTS',
        description: `Found ${ghostReceipts.length} receipts that are not linked to any Payment record.`,
        metadata: { receipts: ghostReceipts.map(r => r.receiptNumber) }
      });
    }

    // 5. Accounting Period Gap Check
    // (Ensure transactions aren't posted to CLOSED or LOCKED periods)
    const postingsToClosedPeriods = await this.prisma.journalEntry.findMany({
      where: { 
        tenantId, 
        period: { status: { in: ['CLOSED', 'LOCKED', 'YEAR_CLOSED', 'ARCHIVED'] } } 
      },
      select: { id: true, periodId: true }
    });

    if (postingsToClosedPeriods.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'POSTING_TO_CLOSED_PERIOD',
        description: `Found ${postingsToClosedPeriods.length} journal entries improperly posted to closed accounting periods.`,
        metadata: { entries: postingsToClosedPeriods.map(e => e.id) }
      });
    }

    return report;
  }
}
