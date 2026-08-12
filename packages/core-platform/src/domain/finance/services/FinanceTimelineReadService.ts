import { PrismaClient } from '../../../../prisma/generated/client';

export interface TimelineEvent {
  time: Date;
  eventType: string;
  description: string;
  amount: number;
  runningBalance: number;
  correlationId?: string;
  sourceRecord: string; // e.g. "Invoice:123"
}

export class FinanceTimelineReadService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Dynamically constructs the financial story of a student account by querying and sorting
   * immutable source records (Invoices, Payments, Penalties) in chronological order.
   * This is a Read Model (Projection), not a stored table.
   */
  async getStudentTimeline(params: {
    tenantId: string;
    accountId: string;
  }): Promise<TimelineEvent[]> {
    const { tenantId, accountId } = params;

    // 1. Fetch all Invoices
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, accountId },
      include: { items: true }
    });

    // 2. Fetch all Payments
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, accountId },
      include: { allocations: true, attempt: true }
    });

    const events: Omit<TimelineEvent, 'runningBalance'>[] = [];

    // Map Invoices to events
    for (const inv of invoices) {
      events.push({
        time: inv.createdAt, // Or inv.issueDate if available
        eventType: 'INVOICE_ISSUED',
        description: `Invoice Issued`,
        amount: Number(inv.totalAmount), // Positive increases outstanding balance
        sourceRecord: `Invoice:${inv.id}`,
        correlationId: inv.id // Just tracking back to the source
      });
      // Optionally map penalties, waivers if they are stored as separate models or items
    }

    // Map Payments to events
    for (const pmt of payments) {
      events.push({
        time: pmt.createdAt, // Or gateway callback time
        eventType: 'PAYMENT_RECEIVED',
        description: `Payment Received (${pmt.methodId})`,
        amount: -Number(pmt.amount), // Negative reduces outstanding balance
        sourceRecord: `Payment:${pmt.id}`,
        correlationId: pmt.reference
      });

      // Map Allocations as informational (Amount 0 for running balance purposes, or just metadata)
      for (const alloc of pmt.allocations) {
        events.push({
          time: new Date(pmt.createdAt.getTime() + 1), // slightly offset to appear immediately after payment
          eventType: 'PAYMENT_ALLOCATED',
          description: `Payment allocated to InvoiceItem:${alloc.invoiceItemId}`,
          amount: 0, // Informational only, doesn't change the macroscopic account balance
          sourceRecord: `PaymentAllocation:${alloc.id}`,
          correlationId: pmt.reference
        });
      }
    }

    // Sort chronologically
    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Compute running balance
    let runningBalance = 0;
    const timeline: TimelineEvent[] = events.map(e => {
      runningBalance += e.amount;
      return {
        ...e,
        runningBalance
      };
    });

    return timeline;
  }
}
