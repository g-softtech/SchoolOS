const { SchemaModifier } = require('./safe-schema-modifier');

const schemaPath = 'c:\\my_school_app\\saas-platform\\packages\\core-platform\\prisma\\schema.prisma';
const modifier = new SchemaModifier(schemaPath);

const bankingModels = `
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

modifier.appendModels(bankingModels);

// Update Tenant relations safely
modifier.schema = modifier.schema.replace(/  createdAt +DateTime +@default\(now\(\)\)/, 
`  FinancialTransaction FinancialTransaction[]
  InvoiceVersion InvoiceVersion[]
  FeeStructureVersion FeeStructureVersion[]
  BankStatement BankStatement[]
  BankStatementLine BankStatementLine[]
  ReconciliationRun ReconciliationRun[]
  ReconciliationException ReconciliationException[]
  DailyFinancialSnapshot DailyFinancialSnapshot[]
  StudentBalanceSnapshot StudentBalanceSnapshot[]
  createdAt       DateTime                @default(now())`);

// Update Invoice and FeeStructure to hold versions
modifier.replaceRelation('Invoice', 'createdAt\\s+DateTime\\s+@default\\(now\\(\\)\\)', 
`  versions InvoiceVersion[]\n  createdAt   DateTime                @default(now())`);

modifier.replaceRelation('FeeStructure', 'createdAt\\s+DateTime\\s+@default\\(now\\(\\)\\)', 
`  versions FeeStructureVersion[]\n  createdAt   DateTime                @default(now())`);

// Update StudentFinancialAccount to hold snapshots
modifier.replaceRelation('StudentFinancialAccount', 'createdAt\\s+DateTime\\s+@default\\(now\\(\\)\\)', 
`  snapshots StudentBalanceSnapshot[]\n  createdAt DateTime @default(now())`);

// Update PaymentProvider to hold bank statements
modifier.replaceRelation('PaymentProvider', 'createdAt\\s+DateTime\\s+@default\\(now\\(\\)\\)', 
`  statements BankStatement[]\n  createdAt DateTime  @default(now())`);

modifier.saveAndValidate();
