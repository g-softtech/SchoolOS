import { AllocationStrategy, PaymentAllocationResult } from './AllocationStrategy';

/**
 * Allocates payment strictly to the oldest invoices first (based on dueDate).
 */
export class OldestFirstStrategy implements AllocationStrategy {
  allocate(
    paymentAmount: number,
    outstandingItems: Array<{
      id: string;
      invoiceId: string;
      amountBilled: number;
      amountPaid: number;
      priority: number;
      dueDate: Date;
    }>
  ): PaymentAllocationResult {
    // Sort by oldest due date first
    const sortedItems = [...outstandingItems].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    
    let remaining = paymentAmount;
    const allocations: Array<{ invoiceItemId: string; amount: number }> = [];

    for (const item of sortedItems) {
      if (remaining <= 0) break;
      
      const outstandingForThisItem = item.amountBilled - item.amountPaid;
      if (outstandingForThisItem <= 0) continue;

      const allocationAmount = Math.min(remaining, outstandingForThisItem);
      
      allocations.push({
        invoiceItemId: item.id,
        amount: allocationAmount
      });
      
      remaining -= allocationAmount;
    }

    return {
      allocations,
      unallocatedAmount: remaining
    };
  }
}
