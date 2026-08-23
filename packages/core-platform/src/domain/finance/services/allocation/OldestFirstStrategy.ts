import { AllocationStrategy, AllocationItem, StrategyOutput } from './AllocationStrategy';

/**
 * OLDEST_FIRST — allocates to the invoice item with the earliest due date first.
 * Items with equal due dates are processed in the order they appear.
 */
export class OldestFirstStrategy implements AllocationStrategy {
  allocate(amountToAllocate: number, items: AllocationItem[]): StrategyOutput {
    const sorted = [...items].sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
    );

    let remaining = amountToAllocate;
    const allocations = [];

    for (const item of sorted) {
      if (remaining <= 0) break;
      if (item.outstandingAmount <= 0) continue;

      const toApply = Math.min(remaining, item.outstandingAmount);
      allocations.push({
        invoiceItemId: item.invoiceItemId,
        invoiceId: item.invoiceId,
        amount: toApply,
      });
      remaining -= toApply;
    }

    return { allocations, unallocatedAmount: remaining };
  }
}
