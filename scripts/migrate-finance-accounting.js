const { SchemaModifier } = require('./safe-schema-modifier');

const schemaPath = 'c:\\my_school_app\\saas-platform\\packages\\core-platform\\prisma\\schema.prisma';
const modifier = new SchemaModifier(schemaPath);

const accountingModels = `
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
`;

modifier.appendModels(accountingModels);

// Safely update Tenant relations
modifier.schema = modifier.schema.replace(/  createdAt +DateTime +@default\(now\(\)\)/, 
`  ChartOfAccounts ChartOfAccounts[]
  GLAccount GLAccount[]
  AccountingPeriod AccountingPeriod[]
  JournalEntry JournalEntry[]
  JournalEntryLine JournalEntryLine[]
  createdAt       DateTime                @default(now())`);

modifier.saveAndValidate();
