const fs = require('fs');
const { execSync } = require('child_process');

const schemaPath = 'c:\\my_school_app\\saas-platform\\packages\\core-platform\\prisma\\schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const additionalModels = `
// -----------------------------------------------------------------------------
// DOMAIN 15.1: GENERAL LEDGER & ACCOUNTING
// -----------------------------------------------------------------------------

model ChartOfAccounts {
  id        String      @id @default(uuid())
  tenantId  String
  tenant    Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name      String      // e.g., "Standard School CoA"
  isActive  Boolean     @default(true)

  accounts  GLAccount[]

  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([tenantId])
  @@map("finance_chart_of_accounts")
}

model GLAccount {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  chartOfAccountsId String
  chartOfAccounts ChartOfAccounts   @relation(fields: [chartOfAccountsId], references: [id], onDelete: Cascade)
  code            String            // e.g., "1001"
  name            String            // e.g., "Cash in Bank"
  type            String            // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  isActive        Boolean           @default(true)

  lines           JournalEntryLine[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([tenantId, chartOfAccountsId])
  @@map("finance_gl_accounts")
}

model AccountingPeriod {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name      String   // e.g., "Q1 2026"
  startDate DateTime @db.Date
  endDate   DateTime @db.Date
  status    String   // OPEN, CLOSED, LOCKED

  entries   JournalEntry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("finance_accounting_periods")
}

model JournalEntry {
  id        String            @id @default(uuid())
  tenantId  String
  tenant    Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  periodId  String
  period    AccountingPeriod  @relation(fields: [periodId], references: [id])
  date      DateTime          @db.Date
  reference String            // Payment ID, Invoice ID, etc.
  memo      String?
  status    String            // DRAFT, POSTED, VOIDED

  lines     JournalEntryLine[]

  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@index([tenantId, periodId])
  @@map("finance_journal_entries")
}

model JournalEntryLine {
  id        String       @id @default(uuid())
  tenantId  String
  tenant    Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  entryId   String
  entry     JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  accountId String
  account   GLAccount    @relation(fields: [accountId], references: [id])
  debit     Decimal      @default(0)
  credit    Decimal      @default(0)
  memo      String?

  createdAt DateTime     @default(now())

  @@index([tenantId, entryId])
  @@map("finance_journal_entry_lines")
}

// -----------------------------------------------------------------------------
// DOMAIN 15.2: BANKING & ENTERPRISE RECONCILIATION
// -----------------------------------------------------------------------------

model FinancialTransaction {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  transactionRef  String            @unique // e.g. TXN-2026-000000000123
  type            String            // INVOICE, PAYMENT, REFUND, ADJUSTMENT
  description     String?
  source          String            // MANUAL, GATEWAY, SCHEDULED_JOB
  status          String            // PENDING, COMPLETED, FAILED, REVERSED
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([tenantId, transactionRef])
  @@map("finance_transactions")
}

model InvoiceVersion {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoiceId       String
  invoice         Invoice           @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  versionNumber   Int
  payload         Json              // Snapshot of invoice and items at this version
  createdAt       DateTime          @default(now())

  @@index([tenantId, invoiceId])
  @@map("finance_invoice_versions")
}

model FeeStructureVersion {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  feeStructureId  String
  feeStructure    FeeStructure      @relation(fields: [feeStructureId], references: [id], onDelete: Cascade)
  versionNumber   Int
  payload         Json              // Snapshot of fee structure and rules
  createdAt       DateTime          @default(now())

  @@index([tenantId, feeStructureId])
  @@map("finance_fee_structure_versions")
}

model BankStatement {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  providerId      String
  provider        PaymentProvider   @relation(fields: [providerId], references: [id])
  statementDate   DateTime          @db.Date
  openingBalance  Decimal
  closingBalance  Decimal
  status          String            // UPLOADED, RECONCILED, EXCEPTIONS

  lines           BankStatementLine[]
  runs            ReconciliationRun[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([tenantId])
  @@map("finance_bank_statements")
}

model BankStatementLine {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  statementId     String
  statement       BankStatement     @relation(fields: [statementId], references: [id], onDelete: Cascade)
  transactionDate DateTime          @db.Date
  amount          Decimal
  reference       String?           // Gateway or bank ref
  description     String?
  reconciled      Boolean           @default(false)

  exceptions      ReconciliationException[]

  createdAt       DateTime          @default(now())

  @@index([tenantId, statementId])
  @@map("finance_bank_statement_lines")
}

model ReconciliationRun {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  statementId     String
  statement       BankStatement     @relation(fields: [statementId], references: [id], onDelete: Cascade)
  runDate         DateTime          @default(now())
  status          String            // COMPLETED, FAILED
  matchedCount    Int               @default(0)
  exceptionCount  Int               @default(0)

  createdAt       DateTime          @default(now())

  @@index([tenantId, statementId])
  @@map("finance_reconciliation_runs")
}

model ReconciliationException {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lineId          String
  line            BankStatementLine @relation(fields: [lineId], references: [id], onDelete: Cascade)
  reason          String            // DUPLICATE, NOT_FOUND, AMOUNT_MISMATCH
  status          String            // OPEN, RESOLVED

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([tenantId, lineId])
  @@map("finance_reconciliation_exceptions")
}

model DailyFinancialSnapshot {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  date            DateTime          @db.Date
  totalBilled     Decimal
  totalCollected  Decimal
  totalOutstanding Decimal
  metrics         Json?             // e.g. collection by campus, fee type

  createdAt       DateTime          @default(now())

  @@unique([tenantId, date])
  @@map("finance_daily_snapshots")
}

model StudentBalanceSnapshot {
  id              String            @id @default(uuid())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accountId       String
  account         StudentFinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  asOfDate        DateTime          @db.Date
  balance         Decimal
  totalPaid       Decimal
  totalBilled     Decimal

  createdAt       DateTime          @default(now())

  @@unique([tenantId, accountId, asOfDate])
  @@map("finance_student_balance_snapshots")
}
`;

schema += '\n' + additionalModels;

// Safely insert relations into Tenant
schema = schema.replace(/  createdAt       DateTime                @default\\(now\\(\\)\\)/,
`  ChartOfAccounts ChartOfAccounts[]
  GLAccount GLAccount[]
  AccountingPeriod AccountingPeriod[]
  JournalEntry JournalEntry[]
  JournalEntryLine JournalEntryLine[]
  FinancialTransaction FinancialTransaction[]
  InvoiceVersion InvoiceVersion[]
  FeeStructureVersion FeeStructureVersion[]
  BankStatement BankStatement[]
  BankStatementLine BankStatementLine[]
  ReconciliationRun ReconciliationRun[]
  ReconciliationException ReconciliationException[]
  DailyFinancialSnapshot DailyFinancialSnapshot[]
  StudentBalanceSnapshot StudentBalanceSnapshot[]
  createdAt       DateTime                @default(now())`);

function insertRelation(modelName, beforeStr, toInsert) {
  const regex = new RegExp(`(model ${modelName} \\{[\\s\\S]*?)(\\n\\s*${beforeStr})`);
  schema = schema.replace(regex, `$1\\n  ${toInsert}$2`);
}

insertRelation('Invoice', 'createdAt   DateTime                @default\\(now\\(\\)\\)', 'versions InvoiceVersion[]');
insertRelation('FeeStructure', 'createdAt   DateTime                @default\\(now\\(\\)\\)', 'versions FeeStructureVersion[]');
insertRelation('StudentFinancialAccount', 'createdAt DateTime @default\\(now\\(\\)\\)', 'snapshots StudentBalanceSnapshot[]');
insertRelation('PaymentProvider', 'createdAt DateTime  @default\\(now\\(\\)\\)', 'statements BankStatement[]');

fs.writeFileSync(schemaPath, schema, 'utf8');

console.log('Running format and validation...');
try {
  execSync('npx --yes prisma@5.22.0 format --schema ' + schemaPath, { stdio: 'inherit' });
  console.log('Format successful. Run validation and generate manually.');
} catch (e) {
  console.error('Format failed', e.message);
  process.exit(1);
}
