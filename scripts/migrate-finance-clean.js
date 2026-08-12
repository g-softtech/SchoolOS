const { SchemaModifier } = require('./safe-schema-modifier');

const schemaPath = 'c:\\my_school_app\\saas-platform\\packages\\core-platform\\prisma\\schema.prisma';
const modifier = new SchemaModifier(schemaPath);

// Legacy models from old design
const legacyModels = [
  'Invoice', 'InvoiceItem', 'Payment', 'PaymentMethod', 'FeeCategory'
];

// Remove legacy enum
modifier.schema = modifier.schema.replace(/enum PaymentMethod \{[\s\S]*?\}/, '');

for (const model of legacyModels) {
  modifier.removeModel(model);
}

// Remove relations from Tenant
modifier.removeRelation('Tenant', 'Invoice\\s+Invoice\\[\\]');
modifier.removeRelation('Tenant', 'Payment\\s+Payment\\[\\]');
modifier.removeRelation('Tenant', 'FeeCategory\\s+FeeCategory\\[\\]');

// Remove relations from AcademicTerm
modifier.removeRelation('AcademicTerm', 'Invoice\\s+Invoice\\[\\]');
modifier.removeRelation('Student', 'Invoice\\s+Invoice\\[\\]');


const financeModels = `
// -----------------------------------------------------------------------------
// DOMAIN 15: FINANCE
// -----------------------------------------------------------------------------

model PaymentMethod {
  id        String    @id @default(uuid())
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  code      String    // CASH, BANK_TRANSFER, POS, ONLINE
  name      String

  payments  Payment[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([tenantId])
  @@map("finance_payment_methods")
}

model PaymentProvider {
  id        String    @id @default(uuid())
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  code      String    // PAYSTACK, MANUAL, STRIPE
  name      String
  isActive  Boolean   @default(true)

  payments  Payment[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([tenantId])
  @@map("finance_payment_providers")
}

model FeeStructure {
  id        String    @id @default(uuid())
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  campusId  String?   // optional for multi-campus support
  name      String    // e.g. "2026 Boarding Tuition"

  items     FeeItem[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([tenantId])
  @@map("finance_fee_structures")
}

model FeeItem {
  id          String       @id @default(uuid())
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  structureId String
  structure   FeeStructure @relation(fields: [structureId], references: [id], onDelete: Cascade)
  name        String       // e.g. "Laboratory Fee"
  amount      Decimal

  rules       ChargeRule[]

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([tenantId, structureId])
  @@map("finance_fee_items")
}

model ChargeRule {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  itemId    String
  item      FeeItem  @relation(fields: [itemId], references: [id], onDelete: Cascade)
  condition Json     // Rules engine config, e.g. {"studentType": "BOARDER"}

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, itemId])
  @@map("finance_charge_rules")
}

model StudentFinancialAccount {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  studentId String   @unique
  student   Student  @relation(fields: [studentId], references: [id])
  currency  String   @default("NGN")

  ledgerEntries FinancialLedgerEntry[]
  invoices      Invoice[]
  payments      Payment[]
  subsidies     Subsidy[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, studentId])
  @@map("finance_student_accounts")
}

model FinancialLedgerEntry {
  id              String                  @id @default(uuid())
  tenantId        String
  tenant          Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accountId       String
  account         StudentFinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  transactionType String                  // INVOICE, PAYMENT, REFUND, WAIVER
  debit           Decimal                 @default(0) // Money owed by student
  credit          Decimal                 @default(0) // Money paid/reduced
  referenceId     String                  // Polymorphic ref to Invoice/Payment

  createdAt       DateTime                @default(now())

  @@index([tenantId, accountId])
  @@map("finance_ledger_entries")
}

model Invoice {
  id          String                  @id @default(uuid())
  tenantId    String
  tenant      Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accountId   String
  account     StudentFinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  status      String                  // DRAFT, ISSUED, PARTIAL, PAID, CANCELLED
  dueDate     DateTime                @db.Date
  totalAmount Decimal

  items       InvoiceItem[]
  plans       InstallmentPlan[]

  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  @@index([tenantId, accountId])
  @@map("finance_invoices")
}

model InvoiceItem {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description String
  amount      Decimal
  amountPaid  Decimal  @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId, invoiceId])
  @@map("finance_invoice_items")
}

model InstallmentPlan {
  id          String                @id @default(uuid())
  tenantId    String
  tenant      Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoiceId   String
  invoice     Invoice               @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  schedules   InstallmentSchedule[]

  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  @@index([tenantId, invoiceId])
  @@map("finance_installment_plans")
}

model InstallmentSchedule {
  id              String          @id @default(uuid())
  tenantId        String
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  planId          String
  plan            InstallmentPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  dueDate         DateTime        @db.Date
  amount          Decimal
  paidAmount      Decimal         @default(0)
  status          String          // PENDING, PAID, OVERDUE
  gracePeriodDays Int             @default(0)

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([tenantId, planId])
  @@map("finance_installment_schedules")
}

model Payment {
  id          String                  @id @default(uuid())
  tenantId    String
  tenant      Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accountId   String
  account     StudentFinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  methodId    String
  method      PaymentMethod           @relation(fields: [methodId], references: [id])
  providerId  String
  provider    PaymentProvider         @relation(fields: [providerId], references: [id])
  amount      Decimal
  reference   String                  // Gateway Ref
  status      String                  // SUCCESS, FAILED, REFUNDED

  receipt     Receipt?
  refunds     Refund[]

  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  @@index([tenantId, accountId])
  @@map("finance_payments")
}

model Receipt {
  id            String   @id @default(uuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  paymentId     String   @unique
  payment       Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  receiptNumber String   @unique
  issuedAt      DateTime @default(now())

  createdAt     DateTime @default(now())

  @@index([tenantId, paymentId])
  @@map("finance_receipts")
}

model Refund {
  id         String   @id @default(uuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  paymentId  String
  payment    Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  amount     Decimal
  reason     String
  approvedBy String   // GlobalUser reference
  approvedAt DateTime @default(now())

  createdAt  DateTime @default(now())

  @@index([tenantId, paymentId])
  @@map("finance_refunds")
}

model Subsidy {
  id                 String                  @id @default(uuid())
  tenantId           String
  tenant             Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accountId          String
  account            StudentFinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  type               String                  // SCHOLARSHIP, WAIVER, DISCOUNT
  amountOrPercentage Decimal
  approvedBy         String
  validFrom          DateTime?               @db.Date
  validTo            DateTime?               @db.Date

  createdAt          DateTime                @default(now())
  updatedAt          DateTime                @updatedAt

  @@index([tenantId, accountId])
  @@map("finance_subsidies")
}
`;

modifier.appendModels(financeModels);

// Update Tenant relations safely
modifier.schema = modifier.schema.replace(/  createdAt +DateTime +@default\(now\(\)\)/, 
`  PaymentMethod PaymentMethod[]
  PaymentProvider PaymentProvider[]
  FeeStructure FeeStructure[]
  FeeItem FeeItem[]
  ChargeRule ChargeRule[]
  StudentFinancialAccount StudentFinancialAccount[]
  FinancialLedgerEntry FinancialLedgerEntry[]
  Invoice Invoice[]
  InvoiceItem InvoiceItem[]
  InstallmentPlan InstallmentPlan[]
  InstallmentSchedule InstallmentSchedule[]
  Payment Payment[]
  Receipt Receipt[]
  Refund Refund[]
  Subsidy Subsidy[]
  createdAt       DateTime                @default(now())`);

modifier.saveAndValidate();
