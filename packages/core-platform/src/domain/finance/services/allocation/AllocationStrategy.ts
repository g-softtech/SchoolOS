/**
 * AllocationStrategy — Item shape accepted by all allocation strategies.
 *
 * `outstandingAmount` is pre-computed by the caller from `PaymentAllocation`
 * aggregate. Strategies must NOT touch `InvoiceItem.amountPaid` (stale column).
 */
export interface AllocationItem {
  invoiceItemId: string;
  invoiceId: string;
  /** Outstanding amount in naira (Decimal-compatible number) */
  outstandingAmount: number;
  /** Lower priority = allocated first in PRIORITY_FIRST strategy */
  priority: number;
  /** Used as tiebreaker in OLDEST_FIRST strategy */
  dueDate: Date;
}

export interface AllocationResult {
  invoiceItemId: string;
  invoiceId: string;
  /** Amount allocated to this item, in naira */
  amount: number;
}

export interface StrategyOutput {
  allocations: AllocationResult[];
  /** Amount remaining after all items exhausted (will become student credit) */
  unallocatedAmount: number;
}

export interface AllocationStrategy {
  allocate(amountToAllocate: number, items: AllocationItem[]): StrategyOutput;
}
