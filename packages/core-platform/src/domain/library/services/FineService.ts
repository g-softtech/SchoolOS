import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { InvoiceService } from '../../finance/services/InvoiceService';
import { PlatformEventBus } from '../../../providers/platform-event-bus';

export interface AssessFineDto {
  tenantId: string;
  borrowingId: string;
  amountKobo: number;
  reason: string;
}

@Injectable()
export class FineService {
  private readonly logger = new Logger(FineService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly invoiceService: InvoiceService,
    private readonly eventBus: PlatformEventBus,
  ) {}

  /**
   * Idempotently assess a fine for a borrowing.
   */
  async assessFine(data: AssessFineDto) {
    const borrowing = await this.prisma.bookBorrowing.findUnique({
      where: { id: data.borrowingId },
      include: { book: true, student: true }
    });
    if (!borrowing || borrowing.book.tenantId !== data.tenantId) {
      throw new NotFoundException('Borrowing not found');
    }

    // Check idempotency: does a fine already exist for this borrowing?
    let existingFine = await this.prisma.libraryFine.findUnique({
      where: { borrowingId: data.borrowingId },
    });

    if (existingFine) {
      return existingFine; // Idempotent response
    }

    // 1. Generate an invoice for the fine using InvoiceService
    // We assume there's an active term; for now, we use the student's admission term or fallback
    // In a real scenario, we'd query the active term.
    const activeTerm = await this.prisma.term.findFirst({
      where: { tenantId: data.tenantId, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    });
    
    if (!activeTerm) {
      throw new BadRequestException('Cannot assess fine without an active academic term');
    }

    const fineAmountDecimal = new Prisma.Decimal(data.amountKobo).div(100);

    // Use transaction to ensure Invoice + Fine are created together atomically
    // Wait, InvoiceService doesn't accept a transaction client for creation, so we do it sequentially,
    // but we can use InvoiceService directly, then create LibraryFine.

    const draftInvoice = await this.invoiceService.createDraftInvoice({
      tenantId: data.tenantId,
      studentId: borrowing.studentId,
      termId: activeTerm.id,
      invoiceNumber: `LIB-${data.tenantId.substring(0,4).toUpperCase()}-${Date.now()}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      items: [
        {
          description: `Library Fine: ${data.reason} (${borrowing.book.title})`,
          amountKobo: data.amountKobo,
        }
      ]
    });

    // 2. Issue the invoice immediately (Library fines are active instantly)
    // For issuing, we need AR and Revenue accounts. We'll fetch defaults or dummy them if missing.
    // In production, these should come from tenant settings.
    const arAccount = await this.prisma.chartOfAccount.findFirst({ where: { tenantId: data.tenantId, type: 'ASSET' }});
    const revAccount = await this.prisma.chartOfAccount.findFirst({ where: { tenantId: data.tenantId, type: 'REVENUE' }});
    
    if (arAccount && revAccount) {
      await this.invoiceService.issueInvoice({
        tenantId: data.tenantId,
        invoiceId: draftInvoice.id,
        arAccountId: arAccount.id,
        revenueAccountId: revAccount.id,
        ledgerReference: `LEDGER-LIB-${draftInvoice.id}`,
        transactionDate: new Date(),
      });
    }

    // 3. Create the LibraryFine linked to the Invoice
    const fine = await this.prisma.libraryFine.create({
      data: {
        tenantId: data.tenantId,
        borrowingId: data.borrowingId,
        amount: fineAmountDecimal,
        reason: data.reason,
        status: 'ASSESSED',
        invoiceId: draftInvoice.id,
      }
    });

    await this.eventBus.publish('LibraryFine.Assessed', { fineId: fine.id, tenantId: fine.tenantId });

    return fine;
  }

  async waiveFine(tenantId: string, fineId: string) {
    const fine = await this.prisma.libraryFine.findUnique({ where: { id: fineId, tenantId } });
    if (!fine) throw new NotFoundException('Fine not found');
    if (fine.status !== 'ASSESSED') throw new BadRequestException(`Cannot waive a ${fine.status} fine`);

    // In finance, waiving means cancelling the invoice or applying a credit note.
    if (fine.invoiceId) {
       await this.invoiceService.cancelInvoice({ tenantId, invoiceId: fine.invoiceId });
    }

    return this.prisma.libraryFine.update({
      where: { id: fineId },
      data: { status: 'WAIVED' }
    });
  }

  // We should have an event listener somewhere that marks the fine SETTLED when the invoice is PAID.
}
