import { Controller, Get, Post, Body, Param, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { FinancialLedgerService } from '@saas/core-platform';
import { ApiResponseDto } from '../../admissions/dto/response/api-response.dto';
import {
  CreateChartOfAccountDto,
  CreateAccountingPeriodDto,
  CreateBankAccountDto,
  CreateFeeCategoryDto,
  UpdateFeeCategoryDto,
} from '../dto/create/admin.dto';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@saas/core-platform';

@ApiTags('Finance - Administration')
@ApiBearerAuth()
@Controller({ path: 'finance', version: '1' })
export class FinanceAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: FinancialLedgerService,
  ) {}

  // ── Chart of Accounts ──────────────────────────────────────────────────────

  @Get('coa')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'List Chart of Accounts' })
  async listAccounts(@CurrentWorkspace() ctx: WorkspaceContext) {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
    return new ApiResponseDto(true, accounts, { message: 'Chart of accounts retrieved' });
  }

  @Post('coa')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.admin')
  @ApiOperation({ summary: 'Create a Chart of Account entry' })
  async createAccount(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateChartOfAccountDto,
  ) {
    const account = await this.prisma.chartOfAccount.create({
      data: {
        tenantId: ctx.tenantId,
        code: dto.code,
        name: dto.name,
        type: dto.type as any,
        description: dto.description,
      },
    });
    return new ApiResponseDto(true, account, { message: 'Account created' });
  }

  // ── Accounting Periods ─────────────────────────────────────────────────────

  @Get('periods')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'List accounting periods' })
  async listPeriods(@CurrentWorkspace() ctx: WorkspaceContext) {
    const periods = await this.prisma.accountingPeriod.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startDate: 'desc' },
    });
    return new ApiResponseDto(true, periods, { message: 'Periods retrieved' });
  }

  @Post('periods')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.admin')
  @ApiOperation({ summary: 'Create an accounting period' })
  async createPeriod(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateAccountingPeriodDto,
  ) {
    const period = await this.prisma.accountingPeriod.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'OPEN',
      },
    });
    return new ApiResponseDto(true, period, { message: 'Period created' });
  }

  @Put('periods/:id/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('finance.admin')
  @ApiOperation({ summary: 'Close an accounting period — no new postings will be accepted' })
  async closePeriod(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const period = await this.prisma.accountingPeriod.findUnique({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!period) return new ApiResponseDto(false, null, { message: 'Period not found' });
    if (period.status === 'CLOSED') return new ApiResponseDto(false, null, { message: 'Period already closed' });

    const closed = await this.prisma.accountingPeriod.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date(), closedBy: (ctx as any).userId ?? 'SYSTEM' },
    });
    return new ApiResponseDto(true, closed, { message: 'Period closed' });
  }

  // ── Bank Accounts ──────────────────────────────────────────────────────────

  @Get('bank-accounts')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'List bank accounts' })
  async listBankAccounts(@CurrentWorkspace() ctx: WorkspaceContext) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: { ledgerAccount: true },
    });
    return new ApiResponseDto(true, accounts, { message: 'Bank accounts retrieved' });
  }

  @Post('bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.admin')
  @ApiOperation({ summary: 'Create a bank account' })
  async createBankAccount(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateBankAccountDto,
  ) {
    const account = await this.prisma.bankAccount.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        ledgerAccountId: dto.ledgerAccountId,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
      },
    });
    return new ApiResponseDto(true, account, { message: 'Bank account created' });
  }

  // ── Fee Categories ─────────────────────────────────────────────────────────

  @Get('fee-categories')
  @RequirePermission('finance.view')
  @ApiOperation({ summary: 'List fee categories' })
  async listFeeCategories(@CurrentWorkspace() ctx: WorkspaceContext) {
    const cats = await this.prisma.feeCategory.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: 'asc' },
    });
    return new ApiResponseDto(true, cats, { message: 'Fee categories retrieved' });
  }

  @Post('fee-categories')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('finance.admin')
  @ApiOperation({ summary: 'Create a fee category' })
  async createFeeCategory(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Body() dto: CreateFeeCategoryDto,
  ) {
    const cat = await this.prisma.feeCategory.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amountKobo).div(100),
        mandatory: dto.mandatory ?? true,
      },
    });
    return new ApiResponseDto(true, cat, { message: 'Fee category created' });
  }

  @Put('fee-categories/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('finance.admin')
  @ApiOperation({ summary: 'Update a fee category' })
  async updateFeeCategory(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('id') id: string,
    @Body() dto: UpdateFeeCategoryDto,
  ) {
    const cat = await this.prisma.feeCategory.update({
      where: { id, tenantId: ctx.tenantId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amountKobo ? { amount: new Prisma.Decimal(dto.amountKobo).div(100) } : {}),
        ...(dto.mandatory !== undefined ? { mandatory: dto.mandatory } : {}),
      },
    });
    return new ApiResponseDto(true, cat, { message: 'Fee category updated' });
  }
}
