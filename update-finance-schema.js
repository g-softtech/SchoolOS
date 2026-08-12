const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Add PaymentAttempt
const paymentAttemptModel = `
model PaymentAttempt {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  gateway      String
  status       String   // PENDING, AUTHORIZED, CAPTURED, FAILED, TIMED_OUT, REVERSED
  reference    String
  response     Json?
  retries      Int      @default(0)
  
  payment      Payment? // Created if attempt succeeds
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([tenantId, reference])
  @@map("finance_payment_attempts")
}
`;

// 2. Add PaymentAllocation
const paymentAllocationModel = `
model PaymentAllocation {
  id              String               @id @default(uuid())
  tenantId        String
  tenant          Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  paymentId       String
  payment         Payment              @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  invoiceItemId   String
  invoiceItem     InvoiceItem          @relation(fields: [invoiceItemId], references: [id])
  transactionId   String
  transaction     FinancialTransaction @relation(fields: [transactionId], references: [id])
  amount          Decimal
  
  createdAt       DateTime @default(now())
  
  @@index([tenantId, paymentId])
  @@index([tenantId, invoiceItemId])
  @@map("finance_payment_allocations")
}
`;

// 3. Add InstallmentPlanVersion
const installmentPlanVersionModel = `
model InstallmentPlanVersion {
  id                String          @id @default(uuid())
  tenantId          String
  tenant            Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  installmentPlanId String
  installmentPlan   InstallmentPlan @relation(fields: [installmentPlanId], references: [id], onDelete: Cascade)
  versionNumber     Int
  payload           Json            // Snapshot of schedules, penalties, grace periods
  
  createdAt         DateTime @default(now())
  
  @@index([tenantId, installmentPlanId])
  @@map("finance_installment_plan_versions")
}
`;

// 4. Add Generic Approval Engine Models
const approvalModels = `
// -----------------------------------------------------------------------------
// DOMAIN: APPROVAL ENGINE (Global Reusable Workflow)
// -----------------------------------------------------------------------------

model ApprovalWorkflow {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  type        String   // REFUND, WAIVER, VOID_INVOICE, PAYROLL, PURCHASE
  referenceId String   // ID of the entity requesting approval
  status      String   // PENDING, APPROVED, REJECTED, CANCELLED
  amount      Decimal? // Optional amount if threshold-based
  requesterId String
  
  steps       ApprovalStep[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([tenantId, type, status])
  @@map("core_approval_workflows")
}

model ApprovalStep {
  id           String           @id @default(uuid())
  tenantId     String
  workflowId   String
  workflow     ApprovalWorkflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  level        Int
  approverRole String           // Role required to approve (e.g., BURSAR, PRINCIPAL)
  approverId   String?          // Actual user who approved
  status       String           // PENDING, APPROVED, REJECTED
  comments     String?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([tenantId, workflowId])
  @@map("core_approval_steps")
}
`;

// 5. Add Scheduled Finance Jobs
const scheduledJobsModel = `
model ScheduledJob {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  type        String   // LATE_FEE, REMINDER, RECONCILIATION, PERIOD_CLOSE
  status      String   // PENDING, RUNNING, COMPLETED, FAILED
  payload     Json?
  logs        Json?
  lastRunAt   DateTime?
  nextRunAt   DateTime
  retries     Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([tenantId, status, nextRunAt])
  @@map("core_scheduled_jobs")
}
`;

// 6. Sequence Generator (for Receipt numbers, Invoices, etc.)
const sequenceGeneratorModel = `
model SequenceGenerator {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  type         String   // RECEIPT, INVOICE, ADMISSION
  prefix       String?  // e.g., RCT-2026-
  suffix       String?
  currentValue Int      @default(0)
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([tenantId, type, prefix])
  @@map("core_sequence_generators")
}
`;


// Append models to the end of the schema
schema += "\n\n" + paymentAttemptModel + "\n\n" + paymentAllocationModel + "\n\n" + installmentPlanVersionModel + "\n\n" + approvalModels + "\n\n" + scheduledJobsModel + "\n\n" + sequenceGeneratorModel;

// Update Payment model to include currency, baseCurrency, exchangeRate, paymentAttemptId
schema = schema.replace(
  /model Payment \{[\s\S]*?@@map\("finance_payments"\)\n\}/,
  (match) => {
    return match
      .replace('amount     Decimal', 'amount     Decimal\n  currency   String @default("NGN")\n  exchangeRate Decimal @default(1.0)\n  baseCurrency String @default("NGN")\n  paymentAttemptId String? @unique\n  attempt    PaymentAttempt? @relation(fields: [paymentAttemptId], references: [id])')
      .replace('receipt Receipt?', 'receipt Receipt?\n  allocations PaymentAllocation[]');
  }
);

// Update Invoice to include feeStructureSnapshot
schema = schema.replace(
  /model Invoice \{[\s\S]*?@@map\("finance_invoices"\)\n\}/,
  (match) => {
    return match.replace('totalAmount Decimal', 'totalAmount Decimal\n  feeStructureSnapshot Json?');
  }
);

// Update InvoiceItem to include feeItemId and relate to PaymentAllocation
schema = schema.replace(
  /model InvoiceItem \{[\s\S]*?@@map\("finance_invoice_items"\)\n\}/,
  (match) => {
    return match
      .replace('amountPaid  Decimal @default(0)', 'amountPaid  Decimal @default(0)\n  feeItemId   String?\n  feeItem     FeeItem? @relation(fields: [feeItemId], references: [id])\n  allocations PaymentAllocation[]');
  }
);

// Update InstallmentPlan to include penalty configuration and versions
schema = schema.replace(
  /model InstallmentPlan \{[\s\S]*?@@map\("finance_installment_plans"\)\n\}/,
  (match) => {
    return match
      .replace('schedules InstallmentSchedule\\[\\]', 'schedules InstallmentSchedule[]\n  versions InstallmentPlanVersion[]\n  penaltyType String? // FIXED, PERCENTAGE\n  penaltyValue Decimal? @default(0)\n  penaltyCap Decimal?');
  }
);

// Update FinancialTransaction to relate to PaymentAllocation
schema = schema.replace(
  /model FinancialTransaction \{[\s\S]*?@@map\("finance_transactions"\)\n\}/,
  (match) => {
    return match
      .replace('tenant          Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)', 'tenant          Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)\n  allocations     PaymentAllocation[]');
  }
);

// Add missing relation fields to Tenant
schema = schema.replace(
  /model Tenant \{[\s\S]*?@@map\("plt_tenants"\)\n\}/,
  (match) => {
    return match.replace(
      '@@map("plt_tenants")',
      `paymentAttempts PaymentAttempt[]
  paymentAllocations PaymentAllocation[]
  installmentVersions InstallmentPlanVersion[]
  approvalWorkflows ApprovalWorkflow[]
  scheduledJobs ScheduledJob[]
  sequences SequenceGenerator[]
  @@map("plt_tenants")`
    );
  }
);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema successfully updated with Finance 15.2 features.');
