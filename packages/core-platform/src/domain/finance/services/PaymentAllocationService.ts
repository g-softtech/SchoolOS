import { PrismaClient, PaymentAllocation, Prisma } from '../../../../prisma/generated/client';
import { AllocationStrategy } from './allocation/AllocationStrategy';
import { OldestFirstStrategy } from './allocation/OldestFirstStrategy';
import { PriorityFirstStrategy } from './allocation/PriorityFirstStrategy';
import { FinancialLedgerService } from './FinancialLedgerService';
import { InvoiceService } from './InvoiceService';
import { FinanceError, OverAllocationError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidAllocationError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAllocationError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AllocationStrategyType = 'OLDEST_FIRST' | 'PRIORITY_FIRST';

export interface AllocatePaymentParams {
  tenantId: string;
  studentId: string;
  paymentId: string;
  /** Total amount to allocate, in kobo (integer) */
  amountKobo: number;
  strategy: AllocationStrategyType;
  /**
   * Deterministic idempotency reference for the ALLOCATION ledger transaction.
   * Convention: ALLOC-{gatewayRef}-{invoiceId} or similar.
   */
  allocationReference: string;
  /** Account IDs for the ledger entry: Dr Student Prepayments / Cr AR */
  prepaymentLiabilityAccountId: string;
  arAccountId: string;
  /** Dimension tags for the ledger lines */
  dimensionStudentId: string;
  transactionDate: Date;
}

export interface AllocationOutput {
  allocations: PaymentAllocation[];
  /** Remaining kobo not allocated (stays as student credit) */
  unallocatedKobo: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class PaymentAllocationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerService: FinancialLedgerService,
    private readonly invoiceService: InvoiceService,
  ) {}

  private getStrategy(type: AllocationStrategyType): AllocationStrategy {
    switch (type) {
      case 'PRIORITY_FIRST': return new PriorityFirstStrategy();
      case 'OLDEST_FIRST':
      default:               return new OldestFirstStrategy();
    }
  }

  /**
   * Allocates a payment (already received and in Student Prepayments) against
   * outstanding invoice items for the student.
   *
   * Uses SELECT FOR UPDATE locking on invoice items to prevent concurrent
   * over-allocation.
   *
   * Posts a FinancialTransaction(ALLOCATION):
   *   Dr Student Prepayments / Cr Accounts Receivable
   *
   * Updates Invoice.amountPaid cache in the same DB transaction.
   * Invoice status is derived from the allocation aggregate (authoritative).
   */
  async allocatePayment(params: AllocatePaymentParams): Promise<AllocationOutput> {
    if (!Number.isInteger(params.amountKobo) || params.amountKobo <= 0) {
      throw new InvalidAllocationError('amountKobo must be a positive integer');
    }

    const amountNaira = params.amountKobo / 100;

    return await this.prisma.$transaction(
      async (tx) => {
        // ── 1. Lock outstanding invoice items (prevents concurrent over-allocation) ──
        const schemaName = process.env.DATABASE_URL?.match(/schema=([^&]+)/)?.[1] || 'public';
        const schemaRaw = Prisma.raw(`"${schemaName}".`);
        
        // Raw SELECT FOR UPDATE to lock the rows
        const rawItems = await tx.$queryRaw<
          Array<{ id: string; invoiceId: string; amount: string; dueDate: Date }>
        >`
          SELECT ii.id, ii."invoiceId", ii.amount, inv."dueDate"
          FROM ${schemaRaw}"fin_invoice_items" ii
          JOIN ${schemaRaw}"fin_invoices" inv ON inv.id = ii."invoiceId"
          WHERE inv."tenantId" = ${params.tenantId}
            AND inv."studentId" = ${params.studentId}
            AND inv.status IN ('SENT', 'PARTIAL')
            AND inv."deletedAt" IS NULL
          FOR UPDATE OF inv
        `;

        if (rawItems.length === 0) {
          throw new InvalidAllocationError(
            `No outstanding invoices found for student ${params.studentId}`,
          );
        }

        // ── 2. Compute outstanding per item from PaymentAllocation aggregate ──
        const itemIds = rawItems.map((i) => i.id);

        const allocSums = await tx.paymentAllocation.groupBy({
          by: ['invoiceItemId'],
          where: { tenantId: params.tenantId, invoiceItemId: { in: itemIds } },
          _sum: { amount: true },
        });

        const allocMap = new Map(
          allocSums.map((a) => [a.invoiceItemId, Number(a._sum.amount ?? 0)]),
        );

        const outstandingItems = rawItems
          .map((item) => ({
            invoiceItemId: item.id,
            invoiceId: item.invoiceId,
            outstandingAmount: Math.max(0, Number(item.amount) - (allocMap.get(item.id) ?? 0)),
            priority: 10,
            dueDate: new Date(item.dueDate),
          }))
          .filter((i) => i.outstandingAmount > 0);

        // ── 3. Run allocation strategy ──
        const strategy = this.getStrategy(params.strategy);
        const result = strategy.allocate(amountNaira, outstandingItems);

        if (result.allocations.length === 0) {
          throw new InvalidAllocationError(
            'No allocatable outstanding items found. All invoices may be fully paid.',
          );
        }

        // ── 4. Post ALLOCATION ledger transaction ──
        //    Dr Student Prepayments / Cr Accounts Receivable
        const allocatedNaira = result.allocations.reduce((s, a) => s + a.amount, 0);

        const ledgerTx = await this.ledgerService.recordTransaction({
          tenantId: params.tenantId,
          reference: params.allocationReference,
          type: 'ALLOCATION',
          source: 'SYSTEM',
          transactionDate: params.transactionDate,
          lines: [
            {
              accountId: params.prepaymentLiabilityAccountId,
              debit: new Prisma.Decimal(allocatedNaira),
              credit: new Prisma.Decimal(0),
              dimensionStudentId: params.dimensionStudentId,
            },
            {
              accountId: params.arAccountId,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(allocatedNaira),
            },
          ],
        }, tx as unknown as Prisma.TransactionClient);

        // ── 5. Create PaymentAllocation records ──
        const createdAllocations: PaymentAllocation[] = [];
        const affectedInvoiceIds = new Set<string>();

        for (const alloc of result.allocations) {
          const record = await tx.paymentAllocation.create({
            data: {
              tenantId: params.tenantId,
              paymentId: params.paymentId,
              invoiceItemId: alloc.invoiceItemId,
              // Link to the ALLOCATION FinancialTransaction
              transactionId: ledgerTx.id,
              amount: new Prisma.Decimal(alloc.amount),
            },
          });
          createdAllocations.push(record);
          affectedInvoiceIds.add(alloc.invoiceId);
        }

        // ── 6. Sync Invoice.amountPaid cache + status (in same TX) ──
        for (const invoiceId of affectedInvoiceIds) {
          await this.invoiceService.syncInvoicePaymentStatus({
            tenantId: params.tenantId,
            invoiceId,
            tx: tx as unknown as Prisma.TransactionClient,
          });
        }

        return {
          allocations: createdAllocations,
          unallocatedKobo: Math.round(result.unallocatedAmount * 100),
        };
      },
      {
        // Serializable isolation to prevent phantom reads in concurrent allocation
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30_000,
      },
    );
  }
}
