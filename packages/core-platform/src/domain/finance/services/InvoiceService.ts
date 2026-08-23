import { PrismaClient, Invoice, InvoiceItem, Prisma } from '../../../../prisma/generated/client';
import { FinanceError } from './errors';
import { FinancialLedgerService } from './FinancialLedgerService';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidInvoiceStateError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInvoiceStateError';
  }
}

export class InvoiceNotFoundError extends FinanceError {
  constructor(id: string) {
    super(`Invoice ${id} not found`);
    this.name = 'InvoiceNotFoundError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateInvoiceParams {
  tenantId: string;
  studentId: string;
  termId: string;
  invoiceNumber: string; // Caller supplies deterministic reference, e.g. INV-2026-00001
  dueDate: Date;
  items: Array<{
    description: string;
    /** Amount in kobo (integer). Converted to Decimal internally. */
    amountKobo: number;
    feeCategoryId?: string;
  }>;
}

export interface IssueInvoiceParams {
  tenantId: string;
  invoiceId: string;
  /** Chart-of-Account IDs required to post the INVOICE_ISSUE ledger transaction */
  arAccountId: string;
  revenueAccountId: string;
  /** Reference for the ledger FinancialTransaction, e.g. LEDGER-INV-2026-00001 */
  ledgerReference: string;
  transactionDate: Date;
}

export interface InvoiceOutstanding {
  invoiceId: string;
  totalAmountKobo: number;
  allocatedKobo: number;
  outstandingKobo: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class InvoiceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerService: FinancialLedgerService,
  ) {}

  // ─── Create Draft ───────────────────────────────────────────────────────────

  /**
   * Creates a DRAFT invoice. No ledger entries are posted at this stage.
   * All monetary inputs are in integer kobo; stored as Decimal(amount/100).
   */
  async createDraftInvoice(params: CreateInvoiceParams): Promise<Invoice & { items: InvoiceItem[] }> {
    // Validate items have positive kobo amounts
    for (const item of params.items) {
      if (!Number.isInteger(item.amountKobo) || item.amountKobo <= 0) {
        throw new FinanceError(`Item "${item.description}": amountKobo must be a positive integer`);
      }
    }

    const totalKobo = params.items.reduce((s, i) => s + i.amountKobo, 0);
    const totalDecimal = new Prisma.Decimal(totalKobo).div(100);

    return await this.prisma.invoice.create({
      data: {
        tenantId: params.tenantId,
        studentId: params.studentId,
        termId: params.termId,
        invoiceNumber: params.invoiceNumber,
        dueDate: params.dueDate,
        totalAmount: totalDecimal,
        amountPaid: new Prisma.Decimal(0),
        status: 'DRAFT',
        items: {
          create: params.items.map((item) => ({
            description: item.description,
            amount: new Prisma.Decimal(item.amountKobo).div(100),
            feeCategoryId: item.feeCategoryId ?? null,
          })),
        },
      },
      include: { items: true },
    });
  }

  // ─── Issue ───────────────────────────────────────────────────────────────────

  /**
   * Issues a DRAFT invoice:
   *  1. Validates state
   *  2. Posts INVOICE_ISSUE ledger entry:   Dr AR / Cr Revenue
   *  3. Transitions invoice to SENT
   *
   * The ledger posting is done BEFORE the invoice status update.
   * If the ledger rejects (imbalance, closed period, duplicate ref), the invoice
   * remains DRAFT and no state change occurs.
   */
  async issueInvoice(params: IssueInvoiceParams): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: params.invoiceId, tenantId: params.tenantId },
    });

    if (!invoice) throw new InvoiceNotFoundError(params.invoiceId);
    if (invoice.status !== 'DRAFT') {
      throw new InvalidInvoiceStateError(
        `Cannot issue invoice in ${invoice.status} state. Expected DRAFT.`,
      );
    }

    const totalKobo = invoice.totalAmount.mul(100).toNumber();

    // Post ledger entry: Dr Accounts Receivable / Cr Revenue
    await this.ledgerService.recordTransaction({
      tenantId: params.tenantId,
      reference: params.ledgerReference,
      type: 'INVOICE_ISSUE',
      source: 'SYSTEM',
      transactionDate: params.transactionDate,
      lines: [
        { accountId: params.arAccountId,      debit: new Prisma.Decimal(totalKobo).div(100), credit: new Prisma.Decimal(0) },
        { accountId: params.revenueAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(totalKobo).div(100) },
      ],
    });

    // Transition to SENT
    return await this.prisma.invoice.update({
      where: { id: params.invoiceId },
      data: { status: 'SENT' },
    });
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────────

  /**
   * Cancels a DRAFT or SENT invoice.
   * PARTIAL or PAID invoices must go through Refund → Reversal workflows.
   */
  async cancelInvoice(params: { tenantId: string; invoiceId: string }): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: params.invoiceId, tenantId: params.tenantId },
    });

    if (!invoice) throw new InvoiceNotFoundError(params.invoiceId);
    if (['PARTIAL', 'PAID'].includes(invoice.status)) {
      throw new InvalidInvoiceStateError(
        `Cannot directly cancel a ${invoice.status} invoice. Use Refund or Reversal workflows.`,
      );
    }

    return await this.prisma.invoice.update({
      where: { id: params.invoiceId },
      data: { status: 'CANCELED' },
    });
  }

  // ─── Outstanding Balance ──────────────────────────────────────────────────────

  /**
   * Authoritative outstanding balance for an invoice.
   * Derived from PaymentAllocation records, NOT from Invoice.amountPaid.
   * Returns values in kobo.
   */
  async getInvoiceOutstanding(
    tenantId: string,
    invoiceId: string,
  ): Promise<InvoiceOutstanding> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId },
      include: { items: true },
    });

    if (!invoice) throw new InvoiceNotFoundError(invoiceId);

    const itemIds = invoice.items.map((i) => i.id);

    const allocationSum = await this.prisma.paymentAllocation.aggregate({
      where: { tenantId, invoiceItemId: { in: itemIds } },
      _sum: { amount: true },
    });

    const totalKobo = invoice.totalAmount.mul(100).toNumber();
    const allocatedKobo = Math.round(
      (allocationSum._sum.amount ?? new Prisma.Decimal(0)).mul(100).toNumber(),
    );
    const outstandingKobo = Math.max(0, totalKobo - allocatedKobo);

    return { invoiceId, totalAmountKobo: totalKobo, allocatedKobo, outstandingKobo };
  }

  // ─── Update Status (internal, called by PaymentAllocationService) ─────────────

  /**
   * Derives invoice status from PaymentAllocation aggregate (authoritative).
   * Also updates Invoice.amountPaid cache in the same transaction.
   * MUST be called within the same DB transaction as the allocation.
   */
  async syncInvoicePaymentStatus(params: {
    tenantId: string;
    invoiceId: string;
    tx: Prisma.TransactionClient;
  }): Promise<Invoice> {
    const tx = params.tx;

    const invoice = await tx.invoice.findUnique({
      where: { id: params.invoiceId, tenantId: params.tenantId },
      include: { items: true },
    });

    if (!invoice) throw new InvoiceNotFoundError(params.invoiceId);

    const itemIds = invoice.items.map((i) => i.id);

    const allocationSum = await tx.paymentAllocation.aggregate({
      where: { tenantId: params.tenantId, invoiceItemId: { in: itemIds } },
      _sum: { amount: true },
    });

    const totalAmount = invoice.totalAmount;
    const allocatedAmount = allocationSum._sum.amount ?? new Prisma.Decimal(0);

    let newStatus = invoice.status;
    if (allocatedAmount.gte(totalAmount)) {
      newStatus = 'PAID';
    } else if (allocatedAmount.gt(new Prisma.Decimal(0))) {
      newStatus = 'PARTIAL';
    }

    return await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: newStatus,
        // Sync cache: amountPaid must equal authoritative allocation sum
        amountPaid: allocatedAmount,
      },
    });
  }

  // ─── List ────────────────────────────────────────────────────────────────────

  async listInvoices(params: {
    tenantId: string;
    studentId?: string;
    termId?: string;
    status?: string;
    skip?: number;
    take?: number;
  }): Promise<{ invoices: Invoice[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      tenantId: params.tenantId,
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.termId ? { termId: params.termId } : {}),
      ...(params.status ? { status: params.status as any } : {}),
      deletedAt: null,
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { items: true },
        skip: params.skip ?? 0,
        take: params.take ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  async getInvoiceById(tenantId: string, invoiceId: string): Promise<Invoice & { items: InvoiceItem[] }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId },
      include: { items: true },
    });
    if (!invoice) throw new InvoiceNotFoundError(invoiceId);
    return invoice;
  }
}
