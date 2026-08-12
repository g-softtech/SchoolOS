export interface PaymentAllocationResult {
  allocations: Array<{
    invoiceItemId: string;
    amount: number;
  }>;
  unallocatedAmount: number;
}

export interface AllocationStrategy {
  allocate(
    paymentAmount: number,
    outstandingItems: Array<{
      id: string;
      invoiceId: string;
      amountBilled: number;
      amountPaid: number;
      priority: number; // Used for Mandatory First / Priority logic
      dueDate: Date; // Used for Oldest First logic
    }>
  ): PaymentAllocationResult;
}
