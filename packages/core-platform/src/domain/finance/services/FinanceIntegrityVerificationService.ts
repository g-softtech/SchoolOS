import { PrismaClient, Prisma } from '../../../../prisma/generated/client';

export interface AuditReport {
  timestamp: Date;
  isHealthy: boolean;
  issues: Array<{
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    code: string;
    description: string;
    metadata?: unknown;
  }>;
}

/**
 * FinanceIntegrityVerificationService
 *
 * Runs a complete read-only internal audit of the Finance sub-system.
 * All queries use actual schema models and column names.
 * No destructive operations.
 */
export class FinanceIntegrityVerificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async runHealthAudit(tenantId: string): Promise<AuditReport> {
    const report: AuditReport = {
      timestamp: new Date(),
      isHealthy: true,
      issues: [],
    };

    const schemaName = process.env.DATABASE_URL?.match(/schema=([^&]+)/)?.[1] || 'public';
    const schemaRaw = Prisma.raw(`"${schemaName}".`);

    // ── 1. Ledger Imbalance Check ────────────────────────────────────────────
    // Every FinancialTransaction must have SUM(debit) == SUM(credit).
    // Table: fin_journal_entry_lines; FK: "transactionId"
    const imbalances = await this.prisma.$queryRaw<
      Array<{ transactionId: string; totalDebit: string; totalCredit: string }>
    >`
      SELECT "transactionId",
             SUM(debit)  AS "totalDebit",
             SUM(credit) AS "totalCredit"
      FROM   ${schemaRaw}"fin_journal_entry_lines"
      WHERE  "tenantId" = ${tenantId}
      GROUP  BY "transactionId"
      HAVING SUM(debit) != SUM(credit)
    `;

    if (imbalances.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'LEDGER_IMBALANCE',
        description: `Found ${imbalances.length} financial transactions where Debits ≠ Credits.`,
        metadata: { transactionIds: imbalances.map((i) => i.transactionId) },
      });
    }

    // ── 2. Orphaned Allocations ──────────────────────────────────────────────
    // PaymentAllocation.transactionId should never be NULL (schema allows null
    // for backwards compatibility, but our service always writes it).
    const orphaned = await this.prisma.paymentAllocation.findMany({
      where: { tenantId, transactionId: null },
      select: { id: true },
    });

    if (orphaned.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'ORPHANED_ALLOCATIONS',
        description: `Found ${orphaned.length} PaymentAllocation records with no linked FinancialTransaction.`,
        metadata: { allocationIds: orphaned.map((a) => a.id) },
      });
    }

    // ── 3. Invoice.amountPaid Cache Drift ────────────────────────────────────
    // Invoice.amountPaid must equal SUM(PaymentAllocation.amount) for its items.
    // Detects cases where the cache and the authoritative allocation diverged.
    const drifted = await this.prisma.$queryRaw<
      Array<{ invoiceId: string; cachedAmountPaid: string; authoritativeSum: string }>
    >`
      SELECT  inv.id              AS "invoiceId",
              inv."amountPaid"    AS "cachedAmountPaid",
              COALESCE(SUM(pa.amount), 0) AS "authoritativeSum"
      FROM    ${schemaRaw}"fin_invoices" inv
      LEFT JOIN ${schemaRaw}"fin_invoice_items" ii ON ii."invoiceId" = inv.id
      LEFT JOIN ${schemaRaw}"finance_payment_allocations" pa ON pa."invoiceItemId" = ii.id
      WHERE   inv."tenantId" = ${tenantId}
      GROUP   BY inv.id, inv."amountPaid"
      HAVING  inv."amountPaid" != COALESCE(SUM(pa.amount), 0)
    `;

    if (drifted.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'AMOUNT_PAID_CACHE_DRIFT',
        description:
          `Found ${drifted.length} invoices where Invoice.amountPaid cache ` +
          `diverges from the authoritative PaymentAllocation sum.`,
        metadata: drifted,
      });
    }

    // ── 4. Over-Allocated Invoice Items ─────────────────────────────────────
    // SUM(PaymentAllocation.amount) for an InvoiceItem must never exceed item.amount.
    const overAllocated = await this.prisma.$queryRaw<
      Array<{ invoiceItemId: string; itemAmount: string; allocatedSum: string }>
    >`
      SELECT  ii.id        AS "invoiceItemId",
              ii.amount    AS "itemAmount",
              SUM(pa.amount) AS "allocatedSum"
      FROM    ${schemaRaw}"fin_invoice_items" ii
      JOIN    ${schemaRaw}"finance_payment_allocations" pa ON pa."invoiceItemId" = ii.id
      JOIN    ${schemaRaw}"fin_invoices" inv ON inv.id = ii."invoiceId"
      WHERE   inv."tenantId" = ${tenantId}
      GROUP   BY ii.id, ii.amount
      HAVING  SUM(pa.amount) > ii.amount
    `;

    if (overAllocated.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'OVER_ALLOCATED_ITEM',
        description:
          `Found ${overAllocated.length} invoice items where the allocation sum exceeds the billed amount.`,
        metadata: overAllocated,
      });
    }

    // ── 5. Postings to Closed Periods ────────────────────────────────────────
    // No POSTED transaction should reference a CLOSED period.
    const closedPeriodPostings = await this.prisma.financialTransaction.findMany({
      where: {
        tenantId,
        status: 'POSTED',
        period: { status: 'CLOSED' },
      },
      select: { id: true, periodId: true, reference: true },
    });

    if (closedPeriodPostings.length > 0) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'POSTING_TO_CLOSED_PERIOD',
        description:
          `Found ${closedPeriodPostings.length} POSTED transactions in a CLOSED accounting period.`,
        metadata: { transactions: closedPeriodPostings.map((t) => t.reference) },
      });
    }

    // ── 6. Trial Balance (global) ────────────────────────────────────────────
    const trialBalance = await this.prisma.journalEntryLine.aggregate({
      where: { tenantId },
      _sum: { debit: true, credit: true },
    });

    const totalDebits = trialBalance._sum.debit ?? new Prisma.Decimal(0);
    const totalCredits = trialBalance._sum.credit ?? new Prisma.Decimal(0);

    if (!totalDebits.equals(totalCredits)) {
      report.isHealthy = false;
      report.issues.push({
        severity: 'CRITICAL',
        code: 'GLOBAL_TRIAL_BALANCE_IMBALANCE',
        description: `Global trial balance is out of balance: Debits=${totalDebits}, Credits=${totalCredits}`,
        metadata: { totalDebits: totalDebits.toString(), totalCredits: totalCredits.toString() },
      });
    }

    return report;
  }
}
