import { PrismaClient, Invoice, InvoiceItem } from '../../../../prisma/generated/client';
import { FinanceError } from './errors';

export class InvalidInvoiceStateError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInvoiceStateError';
  }
}

export class InvoiceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generates a DRAFT invoice based on a fee structure or ad-hoc items.
   */
  async generateDraftInvoice(params: {
    tenantId: string;
    accountId: string;
    dueDate: Date;
    items: Array<{ description: string; amount: number; feeItemId?: string }>;
    platformPlanId?: string;
  }): Promise<Invoice & { items: InvoiceItem[] }> {
    return await this.prisma.$transaction(async (tx) => {
      const totalAmount = params.items.reduce((sum, item) => sum + item.amount, 0);

      const invoice = await tx.invoice.create({
        data: {
          tenantId: params.tenantId,
          accountId: params.accountId,
          status: 'DRAFT',
          dueDate: params.dueDate,
          totalAmount: totalAmount,
          platformPlanId: params.platformPlanId,
          items: {
            create: params.items.map((item) => ({
              tenantId: params.tenantId,
              description: item.description,
              amount: item.amount,
              feeItemId: item.feeItemId,
              platformPlanId: params.platformPlanId,
            })),
          },
        },
        include: { items: true },
      });

      // Create initial version snapshot
      await tx.invoiceVersion.create({
        data: {
          tenantId: params.tenantId,
          invoiceId: invoice.id,
          versionNumber: 1,
          payload: invoice as any,
        },
      });

      return invoice;
    });
  }

  /**
   * Issues the invoice, locking its items and capturing the fee structure snapshot.
   */
  async issueInvoice(params: {
    tenantId: string;
    invoiceId: string;
    feeStructureSnapshot?: any;
  }): Promise<Invoice> {
    return await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: params.invoiceId, tenantId: params.tenantId },
      });

      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status !== 'DRAFT') {
        throw new InvalidInvoiceStateError(`Cannot issue invoice in ${invoice.status} state. Expected DRAFT.`);
      }

      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'ISSUED',
          feeStructureSnapshot: params.feeStructureSnapshot || null,
        },
      });

      // We do NOT post to the GL here.
      // A FinancialTransaction for "INVOICE_ISSUE" should be created in the application layer,
      // which then calls FinancialLedgerService to post Revenue and Accounts Receivable.
      
      return updated;
    });
  }

  /**
   * Marks an invoice as cancelled. Hard deletes are forbidden.
   */
  async cancelInvoice(params: {
    tenantId: string;
    invoiceId: string;
  }): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: params.invoiceId, tenantId: params.tenantId },
    });

    if (!invoice) throw new Error('Invoice not found');
    
    // Can only cancel DRAFT or ISSUED directly. PAID invoices must go through Refund workflows.
    if (['PAID', 'PARTIALLY_PAID'].includes(invoice.status)) {
      throw new InvalidInvoiceStateError(`Cannot directly cancel a ${invoice.status} invoice. Use Refund or Write-Off workflows.`);
    }

    return await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Internal method called by PaymentAllocationService to update status based on allocations.
   */
  async updateInvoicePaymentStatus(params: {
    tenantId: string;
    invoiceId: string;
    tx: any; // Prisma Transaction Client
  }): Promise<Invoice> {
    const tx = params.tx;
    const invoice = await tx.invoice.findUnique({
      where: { id: params.invoiceId, tenantId: params.tenantId },
      include: { items: true },
    });

    if (!invoice) throw new Error('Invoice not found');

    const totalBilled = Number(invoice.totalAmount);
    let totalPaid = 0;

    for (const item of invoice.items) {
      totalPaid += Number(item.amountPaid);
    }

    let newStatus = invoice.status;
    if (totalPaid >= totalBilled) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    if (newStatus !== invoice.status) {
      return await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });
    }

    return invoice;
  }
}
