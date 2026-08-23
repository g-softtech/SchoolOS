import { AllocationStrategy, AllocationItem, StrategyOutput } from './AllocationStrategy';

/**
 * PRIORITY_FIRST — allocates to items with the lowest priority number first.
 * Equal priority falls back to oldest-due-date ordering.
 */
export class PriorityFirstStrategy implements AllocationStrategy {
  allocate(amountToAllocate: number, items: AllocationItem[]): StrategyOutput {
    const sorted = [...items].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

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
