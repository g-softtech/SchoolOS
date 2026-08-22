-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INVOICE_ISSUE', 'PAYMENT_RECEIPT', 'ALLOCATION', 'REFUND', 'ADJUSTMENT', 'REVERSAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('POSTED', 'VOIDED');

-- DropIndex
DROP INDEX "finance_payment_attempts_tenantId_reference_idx";

-- AlterTable
ALTER TABLE "fin_payments" ALTER COLUMN "invoiceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "finance_payment_allocations" ALTER COLUMN "transactionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "fin_chart_of_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_accounting_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_financial_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_journal_entry_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "memo" TEXT,
    "dimensionStudentId" TEXT,
    "dimensionInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fin_chart_of_accounts_tenantId_code_key" ON "fin_chart_of_accounts"("tenantId", "code");

-- CreateIndex
CREATE INDEX "fin_bank_accounts_tenantId_idx" ON "fin_bank_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "fin_accounting_periods_tenantId_status_idx" ON "fin_accounting_periods"("tenantId", "status");

-- CreateIndex
CREATE INDEX "fin_accounting_periods_tenantId_startDate_endDate_idx" ON "fin_accounting_periods"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "fin_financial_transactions_tenantId_periodId_idx" ON "fin_financial_transactions"("tenantId", "periodId");

-- CreateIndex
CREATE INDEX "fin_financial_transactions_tenantId_transactionDate_idx" ON "fin_financial_transactions"("tenantId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "fin_financial_transactions_tenantId_reference_key" ON "fin_financial_transactions"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "fin_journal_entry_lines_tenantId_accountId_idx" ON "fin_journal_entry_lines"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "fin_journal_entry_lines_tenantId_dimensionStudentId_idx" ON "fin_journal_entry_lines"("tenantId", "dimensionStudentId");

-- CreateIndex
CREATE INDEX "fin_journal_entry_lines_tenantId_dimensionInvoiceId_idx" ON "fin_journal_entry_lines"("tenantId", "dimensionInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_payment_attempts_tenantId_reference_key" ON "finance_payment_attempts"("tenantId", "reference");

-- AddForeignKey
ALTER TABLE "finance_payment_allocations" ADD CONSTRAINT "finance_payment_allocations_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "fin_financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_chart_of_accounts" ADD CONSTRAINT "fin_chart_of_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_accounts" ADD CONSTRAINT "fin_bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_accounts" ADD CONSTRAINT "fin_bank_accounts_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "fin_chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounting_periods" ADD CONSTRAINT "fin_accounting_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_financial_transactions" ADD CONSTRAINT "fin_financial_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_financial_transactions" ADD CONSTRAINT "fin_financial_transactions_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "fin_accounting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_entry_lines" ADD CONSTRAINT "fin_journal_entry_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_entry_lines" ADD CONSTRAINT "fin_journal_entry_lines_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "fin_financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_entry_lines" ADD CONSTRAINT "fin_journal_entry_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fin_chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_entry_lines" ADD CONSTRAINT "fin_journal_entry_lines_dimensionStudentId_fkey" FOREIGN KEY ("dimensionStudentId") REFERENCES "std_students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_entry_lines" ADD CONSTRAINT "fin_journal_entry_lines_dimensionInvoiceId_fkey" FOREIGN KEY ("dimensionInvoiceId") REFERENCES "fin_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Add Check Constraint for strict double-entry ledger mathematics
ALTER TABLE "fin_journal_entry_lines" ADD CONSTRAINT "chk_jel_amounts" CHECK ((debit >= 0 AND credit >= 0) AND NOT (debit > 0 AND credit > 0) AND NOT (debit = 0 AND credit = 0));
