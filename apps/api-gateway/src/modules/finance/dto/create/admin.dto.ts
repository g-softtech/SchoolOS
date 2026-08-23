import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChartOfAccountDto {
  @ApiProperty({ example: '1100', description: 'Unique account code within the tenant' })
  @IsString() @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Accounts Receivable' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] })
  @IsString() @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: 'Amounts owed by students for fees' })
  @IsOptional() @IsString()
  description?: string;
}

export class CreateAccountingPeriodDto {
  @ApiProperty({ example: 'First Term 2026/2027' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  @IsString() @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-12-15T00:00:00.000Z' })
  @IsString() @IsNotEmpty()
  endDate: string;
}

export class CreateBankAccountDto {
  @ApiProperty({ example: 'GTBank School Collection Account' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ID of the linked ChartOfAccount (ASSET type)' })
  @IsString() @IsNotEmpty()
  ledgerAccountId: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional() @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'Guaranty Trust Bank' })
  @IsOptional() @IsString()
  bankName?: string;
}

export class CreateFeeCategoryDto {
  @ApiProperty({ example: 'Tuition' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Main tuition fee for the term' })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ description: 'Amount in kobo (integer). e.g. ₦50,000 = 5000000', example: 5000000 })
  amountKobo: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  mandatory?: boolean;
}

export class UpdateFeeCategoryDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Amount in kobo' })
  @IsOptional()
  amountKobo?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  mandatory?: boolean;
}
