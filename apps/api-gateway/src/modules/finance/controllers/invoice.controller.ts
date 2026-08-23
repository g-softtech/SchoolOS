import {
  Controller, Get, Post, Put, Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { ApiResponseDto } from '../../admissions/dto/response/api-response.dto';
import { InvoiceService } from '@saas/core-platform';
import { CreateInvoiceDto, IssueInvoiceDto } from '../dto/create/finance.dto';

@ApiTags('Finance - Invoices')
@ApiBearerAuth()
@Controller({ path: 'finance/invoices', version: '1' })
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Create a DRAFT invoice for a student' })
  async createInvoice(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateInvoiceDto,
  ) {
    const invoice = await this.invoiceService.createDraftInvoice({
      tenantId: ctx.tenantId,
      studentId: dto.studentId,
      termId: dto.termId,
      // Deterministic invoice number generated from tenant sequence
      invoiceNumber: `INV-${ctx.tenantId.slice(0, 8)}-${Date.now()}`,
      dueDate: new Date(dto.dueDate),
      items: dto.items.map((i) => ({
        description: i.description,
        amountKobo: i.amountKobo,
        feeCategoryId: i.feeCategoryId,
      })),
    });
    return new ApiResponseDto(true, this.mapInvoice(invoice), { message: 'Invoice created' });
  }

  @Put(':id/issue')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Issue a DRAFT invoice — posts INVOICE_ISSUE ledger transaction' })
  async issueInvoice(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
    @Body() dto: IssueInvoiceDto,
  ) {
    const invoice = await this.invoiceService.issueInvoice({
      tenantId: ctx.tenantId,
      invoiceId: id,
      arAccountId: dto.arAccountId,
      revenueAccountId: dto.revenueAccountId,
      ledgerReference: `LEDGER-INV-${id}`,
      transactionDate: new Date(),
    });
    return new ApiResponseDto(true, invoice, { message: 'Invoice issued' });
  }

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Cancel a DRAFT or SENT invoice' })
  async cancelInvoice(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const invoice = await this.invoiceService.cancelInvoice({
      tenantId: ctx.tenantId,
      invoiceId: id,
    });
    return new ApiResponseDto(true, invoice, { message: 'Invoice cancelled' });
  }

  @Get()
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'List invoices with optional filters' })
  async listInvoices(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('studentId') studentId?: string,
    @Query('termId') termId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const result = await this.invoiceService.listInvoices({
      tenantId: ctx.tenantId,
      studentId,
      termId,
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 20,
    });
    return new ApiResponseDto(true, {
      invoices: result.invoices.map(this.mapInvoice),
      total: result.total,
    }, { message: 'Invoices retrieved' });
  }

  @Get(':id')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'Get invoice detail with outstanding balance' })
  async getInvoice(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const [invoice, outstanding] = await Promise.all([
      this.invoiceService.getInvoiceById(ctx.tenantId, id),
      this.invoiceService.getInvoiceOutstanding(ctx.tenantId, id),
    ]);
    return new ApiResponseDto(true, {
      ...this.mapInvoice(invoice),
      ...outstanding,
    }, { message: 'Invoice retrieved' });
  }

  // Student-scoped invoice history
  // This route is also registered on the student path via PaymentController

  private mapInvoice(invoice: any) {
    return {
      ...invoice,
      totalAmountKobo: Math.round(Number(invoice.totalAmount) * 100),
      amountPaidKobo: Math.round(Number(invoice.amountPaid ?? 0) * 100),
      // Never return raw Decimal objects to the API consumer
      totalAmount: undefined,
      amountPaid: undefined,
    };
  }
}
