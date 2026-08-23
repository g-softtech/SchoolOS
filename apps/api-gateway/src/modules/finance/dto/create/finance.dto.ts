import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsPositive,
  IsArray, ValidateNested, ArrayMinSize, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Invoice ──────────────────────────────────────────────────────────────────

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Tuition Fee' })
  @IsString() @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Amount in kobo (integer). ₦50,000 = 5000000', example: 5000000 })
  @IsInt() @IsPositive()
  amountKobo: number;

  @ApiPropertyOptional({ description: 'Fee category ID (optional link)' })
  @IsOptional() @IsString()
  feeCategoryId?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Student ID (from WorkspaceContext — not from body for tenant isolation)' })
  @IsString() @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Academic term ID' })
  @IsString() @IsNotEmpty()
  termId: string;

  @ApiProperty({ description: 'Due date for the invoice', example: '2026-10-30' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ description: 'Invoice items (minimum 1)', type: [CreateInvoiceItemDto] })
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}

export class IssueInvoiceDto {
  @ApiProperty({ description: 'Accounts Receivable account ID (ChartOfAccount)' })
  @IsString() @IsNotEmpty()
  arAccountId: string;

  @ApiProperty({ description: 'Revenue account ID (ChartOfAccount)' })
  @IsString() @IsNotEmpty()
  revenueAccountId: string;
}

// ── Payment ───────────────────────────────────────────────────────────────────

export class ManualPaymentDto {
  @ApiProperty({ description: 'Amount in kobo (integer)', example: 100000 })
  @IsInt() @IsPositive()
  amountKobo: number;

  @ApiProperty({ enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD'] })
  @IsString() @IsNotEmpty()
  method: string;

  @ApiProperty({ description: 'Student ID' })
  @IsString() @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Deterministic payment reference' })
  @IsString() @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Payment date', example: '2026-09-15' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'Invoice ID to link payment to' })
  @IsOptional() @IsString()
  invoiceId?: string;

  @ApiProperty({ description: 'Gateway/cash clearing account ID (ChartOfAccount)' })
  @IsString() @IsNotEmpty()
  gatewayClearingAccountId: string;

  @ApiProperty({ description: 'Student prepayment liability account ID (ChartOfAccount)' })
  @IsString() @IsNotEmpty()
  prepaymentLiabilityAccountId: string;
}

export class AllocatePaymentDto {
  @ApiProperty({ description: 'Amount to allocate in kobo', example: 80000000 })
  @IsInt() @IsPositive()
  amountKobo: number;

  @ApiProperty({ enum: ['OLDEST_FIRST', 'PRIORITY_FIRST'], default: 'OLDEST_FIRST' })
  @IsString() @IsNotEmpty()
  strategy: string;

  @ApiProperty({ description: 'Student ID' })
  @IsString() @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Allocation ledger transaction reference' })
  @IsString() @IsNotEmpty()
  allocationReference: string;

  @ApiProperty({ description: 'Student Prepayments account ID' })
  @IsString() @IsNotEmpty()
  prepaymentLiabilityAccountId: string;

  @ApiProperty({ description: 'Accounts Receivable account ID' })
  @IsString() @IsNotEmpty()
  arAccountId: string;
}

export class PostRefundDto {
  @ApiProperty({ description: 'Refund amount in kobo', example: 5000000 })
  @IsInt() @IsPositive()
  amountKobo: number;

  @ApiProperty({ description: 'Unique refund reference' })
  @IsString() @IsNotEmpty()
  refundReference: string;

  @ApiProperty({ description: 'Student Prepayments account ID' })
  @IsString() @IsNotEmpty()
  prepaymentLiabilityAccountId: string;

  @ApiProperty({ description: 'Bank or clearing account that funds leave from' })
  @IsString() @IsNotEmpty()
  refundSourceAccountId: string;

  @ApiProperty({ description: 'Student ID (dimension for ledger)' })
  @IsString() @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;
}

// ── Transfer ──────────────────────────────────────────────────────────────────

export class PostBankSettlementDto {
  @ApiProperty({ description: 'Settlement amount in kobo', example: 100000000 })
  @IsInt() @IsPositive()
  amountKobo: number;

  @ApiProperty({ description: 'Deterministic settlement reference' })
  @IsString() @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Gateway clearing account ID (source)' })
  @IsString() @IsNotEmpty()
  gatewayClearingAccountId: string;

  @ApiProperty({ description: 'Physical bank account ID (destination)' })
  @IsString() @IsNotEmpty()
  bankAccountId: string;

  @ApiProperty({ description: 'Settlement date', example: '2026-09-20' })
  @IsDateString()
  settlementDate: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;
}

export class ReverseTransactionDto {
  @ApiProperty({ description: 'Unique reference for the reversal transaction' })
  @IsString() @IsNotEmpty()
  reversalReference: string;

  @ApiProperty({ description: 'Reversal date', example: '2026-09-25' })
  @IsDateString()
  reversalDate: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;
}
