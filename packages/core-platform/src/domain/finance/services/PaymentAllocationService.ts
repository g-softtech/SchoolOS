import { PrismaClient, PaymentAllocation } from '../../../../prisma/generated/client';
import { AllocationStrategy } from './allocation/AllocationStrategy';
import { OldestFirstStrategy } from './allocation/OldestFirstStrategy';
import { PriorityFirstStrategy } from './allocation/PriorityFirstStrategy';
import { FinancialLedgerService } from './FinancialLedgerService';
import { FinanceError } from './errors';

export class InvalidAllocationError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAllocationError';
  }
}

export class PaymentAllocationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerService: FinancialLedgerService
  ) {}

  /**
   * Retrieves the requested strategy instance.
   */
  private getStrategy(strategyType: string): AllocationStrategy {
    switch (strategyType) {
      case 'OLDEST_FIRST': return new OldestFirstStrategy();
      case 'PRIORITY_FIRST': return new PriorityFirstStrategy();
      default: return new OldestFirstStrategy(); // Default fallback
    }
  }

  /**
   * Allocates a payment amount to outstanding invoice items based on the given strategy.
   * Preserves allocation history and does not overwrite existing allocations.
   */
  async allocatePayment(params: {
    tenantId: string;
    accountId: string;
    paymentId: string;
    amountToAllocate: number;
    strategy: string;
    correlationId: string;
    periodId: string; // Required for ledger posting
  }): Promise<{ allocations: PaymentAllocation[]; unallocated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch outstanding invoice items for the account
      // Note: In real life, we would join with FeeItem to get the priority, 
      // but for this scaffold we mock the priority or fetch if available.
      const outstandingInvoices = await tx.invoice.findMany({
        where: { 
          tenantId: params.tenantId, 
          accountId: params.accountId,
          status: { in: ['ISSUED', 'PARTIALLY_PAID'] }
        },
        include: { items: true }
      });

      const outstandingItems = outstandingInvoices.flatMap(inv => 
        inv.items.map(item => ({
          id: item.id,
          invoiceId: inv.id,
          amountBilled: Number(item.amount),
          amountPaid: Number(item.amountPaid),
          priority: 10, // Mock priority (could be fetched from item.feeItem.priority)
          dueDate: inv.dueDate,
        }))
      ).filter(item => item.amountBilled > item.amountPaid);

      // 2. Delegate to the pluggable strategy
      const strategyImpl = this.getStrategy(params.strategy);
      const result = strategyImpl.allocate(params.amountToAllocate, outstandingItems);

      // 3. Create the FinancialTransaction root for this operation
      const finTx = await tx.financialTransaction.create({
        data: {
          tenantId: params.tenantId,
          transactionRef: params.correlationId,
          type: 'PAYMENT_ALLOCATION',
          source: 'SYSTEM',
          status: 'COMPLETED',
          description: `Allocation of Payment ${params.paymentId}`,
        }
      });

      // 4. Record allocations and update items
      const createdAllocations: PaymentAllocation[] = [];
      for (const alloc of result.allocations) {
        // Create immutable allocation record
        const record = await tx.paymentAllocation.create({
          data: {
            tenantId: params.tenantId,
            paymentId: params.paymentId,
            invoiceItemId: alloc.invoiceItemId,
            transactionId: finTx.id,
            amount: alloc.amount
          }
        });
        createdAllocations.push(record);

        // Update the item's amountPaid
        await tx.invoiceItem.update({
          where: { id: alloc.invoiceItemId },
          data: { amountPaid: { increment: alloc.amount } }
        });
      }

      // 5. If there's unallocated amount, we keep it as Student Credit 
      // (This is inherently handled by the Ledger Service taking the full amount vs allocated amount)
      
      // Let's assume FinancialLedgerService will be called either here or in the caller 
      // to actually post the JournalEntry for this allocation event (moving money from 
      // Unallocated Cash to Accounts Receivable). For simplicity of the architecture scaffold,
      // we'll assume the ledger call is made by PaymentProcessingService which orchestrates this.

      return {
        allocations: createdAllocations,
        unallocated: result.unallocatedAmount
      };
    });
  }
}
