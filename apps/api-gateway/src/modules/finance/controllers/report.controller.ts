import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { ApiResponseDto } from '../../admissions/dto/response/api-response.dto';
import { TransferService } from '@saas/core-platform';
import { RefundService } from '@saas/core-platform';
import { FinancialLedgerService } from '@saas/core-platform';
import { FinancialReportingReadService } from '@saas/core-platform';
import { ReconciliationService } from '@saas/core-platform';
import { PostBankSettlementDto, ReverseTransactionDto } from '../dto/create/finance.dto';

@ApiTags('Finance - Transfers & Reporting')
@ApiBearerAuth()
@Controller({ path: 'finance', version: '1' })
export class ReportController {
  constructor(
    private readonly transferService: TransferService,
    private readonly refundService: RefundService,
    private readonly ledgerService: FinancialLedgerService,
    private readonly reportingService: FinancialReportingReadService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  // ── Bank Settlement Transfer ───────────────────────────────────────────────

  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.admin')
  @ApiOperation({
    summary: 'Post a bank settlement transfer',
    description: 'Dr Main Bank / Cr Gateway Clearing. Reconciles gateway clearing account.',
  })
  async postBankSettlement(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: PostBankSettlementDto,
  ) {
    const result = await this.transferService.postBankSettlement({
      tenantId: ctx.tenantId,
      reference: dto.reference,
      amountKobo: dto.amountKobo,
      gatewayClearingAccountId: dto.gatewayClearingAccountId,
      bankAccountId: dto.bankAccountId,
      settlementDate: new Date(dto.settlementDate),
      description: dto.description,
    });
    return new ApiResponseDto(true, result, { message: 'Settlement posted' });
  }

  // ── Reversal ───────────────────────────────────────────────────────────────

  @Post('transactions/:ref/reverse')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.admin')
  @ApiOperation({
    summary: 'Reverse a posted transaction — append-only, preserves original as VOIDED',
    description:
      'For a chargeback after bank settlement, first reverse the settlement (SETTLE-...), ' +
      'then reverse the receipt (RECEIPT-...). Both are separate calls.',
  })
  async reverseTransaction(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('ref') originalReference: string,
    @Body() dto: ReverseTransactionDto,
  ) {
    await this.ledgerService.reverseTransaction({
      tenantId: ctx.tenantId,
      originalReference,
      reversalReference: dto.reversalReference,
      reversalDate: new Date(dto.reversalDate),
      description: dto.description,
    });
    return new ApiResponseDto(true, { reversalReference: dto.reversalReference }, { message: 'Reversal posted' });
  }

  // ── Trial Balance ───────────────────────────────────────────────────────────

  @Get('reports/trial-balance')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'Trial balance — ledger-derived, never from cached balances' })
  async getTrialBalance(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('periodId') periodId?: string,
  ) {
    const result = await this.reportingService.getTrialBalance({
      tenantId: ctx.tenantId,
      periodId,
    });
    return new ApiResponseDto(true, result, { message: 'Trial balance retrieved' });
  }

  // ── Financial Summary ───────────────────────────────────────────────────────

  @Get('reports/summary')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'Account balance summary — ledger-derived' })
  async getFinancialSummary(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('periodId') periodId?: string,
  ) {
    const result = await this.reportingService.getFinancialSummary({
      tenantId: ctx.tenantId,
      periodId,
    });
    return new ApiResponseDto(true, result, { message: 'Financial summary retrieved' });
  }

  // ── Account Ledger History ──────────────────────────────────────────────────

  @Get('ledger/:accountId')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'Account ledger history — all journal lines for an account' })
  async getAccountLedger(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('accountId') accountId: string,
  ) {
    const lines = await this.ledgerService.getAccountLedger(ctx.tenantId, accountId);
    return new ApiResponseDto(true, lines, { message: 'Ledger history retrieved' });
  }

  // ── Transaction Audit ───────────────────────────────────────────────────────

  @Get('transactions/:ref')
  @RequirePermission('finance.view')
  @ApiOperation({
    summary: 'Get full audit trail for a transaction reference',
    description:
      'Returns the transaction and all its journal lines. For a chargeback, ' +
      'this returns both the original (VOIDED) and reversal (POSTED) transactions.',
  })
  async getTransactionAudit(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('ref') reference: string,
  ) {
    // Fetch original + any related reversal/reversal-of by reference pattern
    const transactions = await (this.ledgerService as any).prisma.financialTransaction.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { reference },
          { reference: { startsWith: `REV-${reference}` } },
          { reference: { endsWith: reference } },
        ],
      },
      include: { lines: { include: { account: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return new ApiResponseDto(true, {
      count: transactions.length,
      transactions: transactions.map((t: any) => ({
        ...t,
        lines: t.lines.map((l: any) => ({
          ...l,
          debitKobo: Math.round(Number(l.debit) * 100),
          creditKobo: Math.round(Number(l.credit) * 100),
          debit: undefined,
          credit: undefined,
        })),
      })),
    }, { message: 'Transaction audit retrieved' });
  }

  // ── Reconciliation Status ───────────────────────────────────────────────────

  @Get('reconciliation/status')
  @RequirePermission('finance.admin')
  @ApiOperation({
    summary: 'Gateway clearing reconciliation status',
    description: 'Returns clearing balance. Zero means all received funds have been settled to the bank.',
  })
  async getReconciliationStatus(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Query('gatewayClearingAccountId') gatewayClearingAccountId: string,
    @Query('bankAccountId') bankAccountId: string,
  ) {
    const status = await this.reconciliationService.getReconciliationStatus({
      tenantId: ctx.tenantId,
      gatewayClearingAccountId,
      bankAccountId,
    });
    return new ApiResponseDto(true, status, { message: 'Reconciliation status retrieved' });
  }
}
