import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { ApiResponseDto } from '../../admissions/dto/response/api-response.dto';
import { PaymentProcessingService, PaymentAllocationService, StudentCreditService, RefundService, InvoiceService } from '@saas/core-platform';
import { ManualPaymentDto, AllocatePaymentDto, PostRefundDto } from '../dto/create/finance.dto';

@ApiTags('Finance - Payments')
@ApiBearerAuth()
@Controller({ path: 'finance', version: '1' })
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentProcessingService,
    private readonly allocationService: PaymentAllocationService,
    private readonly creditService: StudentCreditService,
    private readonly refundService: RefundService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ── Manual Payment ──────────────────────────────────────────────────────────

  @Post('payments/manual')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Record a manual cash or bank-transfer payment' })
  async recordManualPayment(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: ManualPaymentDto,
  ) {
    const payment = await this.paymentService.recordManualPayment({
      tenantId: ctx.tenantId,
      amountKobo: dto.amountKobo,
      method: dto.method as any,
      reference: dto.reference,
      paymentDate: new Date(dto.paymentDate),
      invoiceId: dto.invoiceId,
      gatewayClearingAccountId: dto.gatewayClearingAccountId,
      prepaymentLiabilityAccountId: dto.prepaymentLiabilityAccountId,
      dimensionStudentId: dto.studentId,
    });
    return new ApiResponseDto(true, {
      ...payment,
      amountKobo: Math.round(Number(payment.amount) * 100),
      amount: undefined,
    }, { message: 'Payment recorded' });
  }

  // ── Allocation ──────────────────────────────────────────────────────────────

  @Post('payments/:id/allocate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('finance.manage')
  @ApiOperation({
    summary: 'Allocate payment against outstanding invoice items',
    description: 'Uses SELECT FOR UPDATE to prevent concurrent over-allocation.',
  })
  async allocatePayment(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') paymentId: string,
    @Body() dto: AllocatePaymentDto,
  ) {
    const result = await this.allocationService.allocatePayment({
      tenantId: ctx.tenantId,
      studentId: dto.studentId,
      paymentId,
      amountKobo: dto.amountKobo,
      strategy: dto.strategy as any,
      allocationReference: dto.allocationReference,
      prepaymentLiabilityAccountId: dto.prepaymentLiabilityAccountId,
      arAccountId: dto.arAccountId,
      dimensionStudentId: dto.studentId,
      transactionDate: new Date(),
    });
    return new ApiResponseDto(true, {
      allocatedCount: result.allocations.length,
      unallocatedKobo: result.unallocatedKobo,
    }, { message: 'Payment allocated' });
  }

  // ── Refund ──────────────────────────────────────────────────────────────────

  @Post('payments/:id/refund')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.admin')
  @ApiOperation({ summary: 'Post a refund transaction (append-only, preserves original)' })
  async postRefund(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') _paymentId: string,
    @Body() dto: PostRefundDto,
  ) {
    const result = await this.refundService.postRefund({
      tenantId: ctx.tenantId,
      refundReference: dto.refundReference,
      amountKobo: dto.amountKobo,
      prepaymentLiabilityAccountId: dto.prepaymentLiabilityAccountId,
      refundSourceAccountId: dto.refundSourceAccountId,
      dimensionStudentId: dto.studentId,
      refundDate: new Date(),
      description: dto.description,
    });
    return new ApiResponseDto(true, result, { message: 'Refund posted' });
  }

  // ── Student Credit ──────────────────────────────────────────────────────────

  @Get('students/:studentId/credit')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'Get student credit balance (ledger-derived)' })
  async getStudentCredit(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
  ) {
    const creditDecimal = await this.creditService.getCreditBalance(ctx.tenantId, studentId);
    return new ApiResponseDto(true, {
      studentId,
      creditKobo: Math.round(creditDecimal.mul(100).toNumber()),
    }, { message: 'Student credit retrieved' });
  }

  // ── Student Balance (Outstanding AR) ────────────────────────────────────────

  @Get('students/:studentId/balance')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'Get student outstanding balance from invoice allocations' })
  async getStudentBalance(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
  ) {
    const result = await this.invoiceService.listInvoices({
      tenantId: ctx.tenantId,
      studentId,
    });

    let totalOutstandingKobo = 0;
    for (const invoice of result.invoices) {
      const outstanding = await this.invoiceService.getInvoiceOutstanding(ctx.tenantId, invoice.id);
      totalOutstandingKobo += outstanding.outstandingKobo;
    }

    return new ApiResponseDto(true, {
      studentId,
      totalOutstandingKobo,
      invoiceCount: result.total,
    }, { message: 'Student balance retrieved' });
  }

  // ── Student Invoice History ─────────────────────────────────────────────────

  @Get('students/:studentId/invoices')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'List invoice history for a student' })
  async getStudentInvoices(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
  ) {
    const result = await this.invoiceService.listInvoices({
      tenantId: ctx.tenantId,
      studentId,
    });
    return new ApiResponseDto(true, result, { message: 'Student invoices retrieved' });
  }
}
