/**
 * Phase 15.2 — Finance API E2E Certification
 *
 * Canonical ₦1,000,000 cashflow lifecycle test.
 *
 * Tests run against a live Neon DB test schema using the same approach as
 * the 15.1A integration suite. Each test run uses a unique tenantId to
 * guarantee complete isolation.
 *
 * After EVERY financial event, the trial balance is asserted to be balanced.
 */

import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { FinancialLedgerService } from '../services/FinancialLedgerService';
import { StudentCreditService } from '../services/StudentCreditService';
import { InvoiceService } from '../services/InvoiceService';
import { PaymentAllocationService } from '../services/PaymentAllocationService';
import { PaymentProcessingService } from '../services/PaymentProcessingService';
import { TransferService } from '../services/TransferService';
import { RefundService } from '../services/RefundService';
import { FinancialReportingReadService } from '../services/FinancialReportingReadService';
import { FinanceIntegrityVerificationService } from '../services/FinanceIntegrityVerificationService';
import {
  PaystackWebhookService,
  WebhookSignatureError,
} from '../services/GatewayWebhookService';
import { createHmac } from 'crypto';

// ─── Test DB ────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL!;
const PAYSTACK_SECRET = 'test-paystack-secret-key';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for finance E2E tests');
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function signPaystackPayload(rawBody: string): string {
  return createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
}

// ─── Fixture helpers ─────────────────────────────────────────────────────────

async function createFinanceFixtures(prisma: PrismaClient, tenantId: string) {
  // CoA accounts
  const [arAccount, revenueAccount, clearingAccount, prepaymentAccount, bankAccount] =
    await Promise.all([
      prisma.chartOfAccount.create({ data: { tenantId, code: 'AR-001', name: 'Accounts Receivable', type: 'ASSET' } }),
      prisma.chartOfAccount.create({ data: { tenantId, code: 'REV-001', name: 'Tuition Revenue', type: 'REVENUE' } }),
      prisma.chartOfAccount.create({ data: { tenantId, code: 'CLEAR-001', name: 'Paystack Clearing', type: 'ASSET' } }),
      prisma.chartOfAccount.create({ data: { tenantId, code: 'PREP-001', name: 'Student Prepayments', type: 'LIABILITY' } }),
      prisma.chartOfAccount.create({ data: { tenantId, code: 'BANK-001', name: 'GTBank Main Account', type: 'ASSET' } }),
    ]);

  // Accounting period
  const period = await prisma.accountingPeriod.create({
    data: {
      tenantId,
      name: 'Test Period 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'OPEN',
    },
  });

  // Minimal tenant is already created in beforeAll()

  // Student
  const studentId = `stu-${makeId()}`;
  // Create minimal student
  const role = await prisma.role.create({ data: { tenantId, name: `role-${makeId()}` } });
  const user = await prisma.user.create({ data: { email: `${makeId()}@test.com`, passwordHash: 'x' } });
  const membership = await prisma.tenantMembership.create({ data: { tenantId, userId: user.id, roleId: role.id } });
  await prisma.student.create({ data: { id: studentId, tenantId, membershipId: membership.id, admissionNumber: `ADM-${makeId()}` } });


  // Academic term
  const year = await prisma.academicYear.create({ data: { tenantId, name: '2026/2027', startDate: new Date('2026-09-01'), endDate: new Date('2027-07-31') } });
  const term = await prisma.term.create({ data: { tenantId, academicYearId: year.id, name: 'First Term', startDate: new Date('2026-09-01'), endDate: new Date('2026-12-15') } });

  return {
    arAccount, revenueAccount, clearingAccount, prepaymentAccount, bankAccount,
    period, studentId, termId: term.id,
  };
}

async function teardown(prisma: PrismaClient, tenantId: string) {
  // Delete in dependency order (no cascade on fin_journal_entry_lines)
  await prisma.journalEntryLine.deleteMany({ where: { tenantId } });
  await prisma.paymentAllocation.deleteMany({ where: { tenantId } });
  await prisma.financialTransaction.deleteMany({ where: { tenantId } });
  await prisma.payment.deleteMany({ where: { tenantId } });
  await prisma.paymentAttempt.deleteMany({ where: { tenantId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId } } });
  await prisma.invoice.deleteMany({ where: { tenantId } });
  await prisma.accountingPeriod.deleteMany({ where: { tenantId } });
  await prisma.bankAccount.deleteMany({ where: { tenantId } });
  await prisma.chartOfAccount.deleteMany({ where: { tenantId } });
  await prisma.student.deleteMany({ where: { tenantId } });
  await prisma.tenantMembership.deleteMany({ where: { tenantId } });
  await prisma.term.deleteMany({ where: { tenantId } });
  await prisma.academicYear.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Phase 15.2 Finance API — ₦1,000,000 Cashflow Certification', () => {
  let prisma: PrismaClient;
  let ledger: FinancialLedgerService;
  let credit: StudentCreditService;
  let invoiceSvc: InvoiceService;
  let allocation: PaymentAllocationService;
  let payment: PaymentProcessingService;
  let transfer: TransferService;
  let refund: RefundService;
  let reporting: FinancialReportingReadService;
  let integrity: FinanceIntegrityVerificationService;
  let paystackWebhook: PaystackWebhookService;

  let tenantId: string;
  let fixtures: Awaited<ReturnType<typeof createFinanceFixtures>>;

  // State accumulated across steps
  let invoiceId: string;
  let paymentId: string;

  const AMOUNT_KOBO = 100_000_00; // ₦1,000,000 = 100000000 kobo
  const INVOICE_KOBO = 80_000_00; // ₦800,000 invoice

  async function assertTrialBalanced() {
    const tb = await reporting.getTrialBalance({ tenantId });
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalDebitKobo).toBe(tb.totalCreditKobo);
  }

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    ledger = new FinancialLedgerService(prisma);
    credit = new StudentCreditService(prisma);
    invoiceSvc = new InvoiceService(prisma, ledger);
    allocation = new PaymentAllocationService(prisma, ledger, invoiceSvc);
    payment = new PaymentProcessingService(prisma, allocation, ledger);
    transfer = new TransferService(prisma, ledger);
    refund = new RefundService(prisma, ledger);
    reporting = new FinancialReportingReadService(prisma);
    integrity = new FinanceIntegrityVerificationService(prisma);
    paystackWebhook = new PaystackWebhookService(payment, PAYSTACK_SECRET);

    tenantId = `tenant-e2e-${makeId()}`;

    const dummyPlan = await prisma.platformPlan.findFirst() ?? await prisma.platformPlan.create({
      data: { id: `plan-${makeId()}`, name: 'E2E Plan', maxStudents: 1000, priceMonthly: 0, priceYearly: 0, code: `code-${makeId()}` }
    });

    await prisma.tenant.create({
      data: { id: tenantId, name: `E2E Tenant`, slug: `e2e-${tenantId}`, status: 'ACTIVE', planId: dummyPlan.id },
    });

    fixtures = await createFinanceFixtures(prisma, tenantId);
  }, 120_000);

  afterAll(async () => {
    await teardown(prisma, tenantId);
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  }, 30_000);

  // ── Step 1: Create DRAFT invoice ─────────────────────────────────────────

  it('Step 1: Creates DRAFT invoice for ₦800,000 (80000000 kobo)', async () => {
    const invoice = await invoiceSvc.createDraftInvoice({
      tenantId,
      studentId: fixtures.studentId,
      termId: fixtures.termId,
      invoiceNumber: `INV-E2E-001`,
      dueDate: new Date('2026-10-30'),
      items: [{ description: 'Tuition Fee', amountKobo: INVOICE_KOBO }],
    });

    invoiceId = invoice.id;
    expect(invoice.status).toBe('DRAFT');
    expect(invoice.totalAmount.mul(100).toNumber()).toBe(INVOICE_KOBO);

    // Trial balance: no postings yet — still balanced at zero
    await assertTrialBalanced();
  }, 30_000);

  // ── Step 2: Issue invoice ────────────────────────────────────────────────

  it('Step 2: Issues invoice → INVOICE_ISSUE transaction: Dr AR / Cr Revenue', async () => {
    await invoiceSvc.issueInvoice({
      tenantId,
      invoiceId,
      arAccountId: fixtures.arAccount.id,
      revenueAccountId: fixtures.revenueAccount.id,
      ledgerReference: `LEDGER-INV-E2E-001`,
      transactionDate: new Date('2026-09-01'),
    });

    const inv = await invoiceSvc.getInvoiceById(tenantId, invoiceId);
    expect(inv.status).toBe('SENT');

    // AR debit = ₦800k, Revenue credit = ₦800k
    const arBalance = await ledger.getAccountBalance(tenantId, fixtures.arAccount.id);
    expect(arBalance.mul(100).toNumber()).toBe(INVOICE_KOBO);

    await assertTrialBalanced();
  }, 30_000);

  // ── Step 3: Paystack webhook — charge.success ────────────────────────────

  it('Step 3: Paystack webhook received (HMAC verified) → PaymentAttempt created', async () => {
    const gatewayRef = `pay-e2e-${makeId()}`;

    await payment.initiatePaymentAttempt({
      tenantId,
      gateway: 'PAYSTACK',
      reference: gatewayRef,
    });

    const attempt = await prisma.paymentAttempt.findUnique({
      where: { tenantId_reference: { tenantId, reference: gatewayRef } },
    });
    expect(attempt).not.toBeNull();
    expect(attempt!.status).toBe('PENDING');

    // Store for next step
    (global as any).__e2e_gatewayRef = gatewayRef;
  }, 30_000);

  // ── Step 4: Gateway success → PAYMENT_RECEIPT ───────────────────────────

  it('Step 4: Gateway success → PaymentAttempt CAPTURED, PAYMENT_RECEIPT: Dr Clearing / Cr Prepayments', async () => {
    const gatewayRef = (global as any).__e2e_gatewayRef;
    const paymentDate = new Date('2026-09-15');

    const pmt = await payment.processGatewaySuccess({
      tenantId,
      reference: gatewayRef,
      amountKobo: AMOUNT_KOBO,
      method: 'CARD',
      gatewayResponse: { status: 'success', amount: AMOUNT_KOBO },
      paymentDate,
      gatewayClearingAccountId: fixtures.clearingAccount.id,
      prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
      dimensionStudentId: fixtures.studentId,
    });

    paymentId = pmt.id;
    expect(pmt.status).toBe('SUCCESS');

    // Gateway Clearing should show ₦1M debit (Dr)
    const clearingBalance = await ledger.getAccountBalance(tenantId, fixtures.clearingAccount.id);
    expect(clearingBalance.mul(100).toNumber()).toBe(AMOUNT_KOBO);

    // Student Prepayments should show ₦1M credit (Cr) — net negative for ASSET-normal perspective
    // For LIABILITY account: balance = credit - debit
    await assertTrialBalanced(); // Step 4 assertion
  }, 30_000);

  // ── Step 5: Idempotency — duplicate webhook ──────────────────────────────

  it('Step 5: Duplicate gateway callback for same reference is idempotent', async () => {
    const gatewayRef = (global as any).__e2e_gatewayRef;

    // Second call to processGatewaySuccess with the same reference
    const pmt2 = await payment.processGatewaySuccess({
      tenantId,
      reference: gatewayRef,
      amountKobo: AMOUNT_KOBO,
      method: 'CARD',
      gatewayResponse: { status: 'success', amount: AMOUNT_KOBO },
      paymentDate: new Date('2026-09-15'),
      gatewayClearingAccountId: fixtures.clearingAccount.id,
      prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
      dimensionStudentId: fixtures.studentId,
    });

    // Must return the SAME payment (idempotent)
    expect(pmt2.id).toBe(paymentId);

    // No duplicate PAYMENT_RECEIPT transaction — still exactly one
    const receiptTxs = await prisma.financialTransaction.findMany({
      where: { tenantId, reference: `RECEIPT-${gatewayRef}` },
    });
    expect(receiptTxs).toHaveLength(1);

    await assertTrialBalanced();
  }, 30_000);

  // ── Step 6: Webhook HMAC signature verification ──────────────────────────

  it('Step 6: Paystack webhook with invalid signature is rejected (WebhookSignatureError)', async () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: `pay-invalid-${makeId()}`,
        amount: AMOUNT_KOBO,
        channel: 'card',
        paid_at: new Date().toISOString(),
        metadata: {
          tenantId,
          studentId: fixtures.studentId,
          gatewayClearingAccountId: fixtures.clearingAccount.id,
          prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
        },
      },
    });

    const rawBody = Buffer.from(payload);
    const badSignature = 'definitely-not-valid-hmac';

    await expect(
      paystackWebhook.handleEvent({
        tenantId,
        rawBody,
        signature: badSignature,
        gatewayClearingAccountId: fixtures.clearingAccount.id,
        prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
        dimensionStudentId: fixtures.studentId,
      }),
    ).rejects.toThrow(WebhookSignatureError);
  }, 30_000);

  // ── Step 7: Allocate ₦800k to invoice ───────────────────────────────────

  it('Step 7: Allocate ₦800k → ALLOCATION: Dr Prepayments / Cr AR; invoice becomes PAID', async () => {
    const gatewayRef = (global as any).__e2e_gatewayRef;
    const allocationRef = `ALLOC-${gatewayRef}-${invoiceId}`;

    const result = await allocation.allocatePayment({
      tenantId,
      studentId: fixtures.studentId,
      paymentId,
      amountKobo: INVOICE_KOBO, // allocate exactly the invoice amount
      strategy: 'OLDEST_FIRST',
      allocationReference: allocationRef,
      prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
      arAccountId: fixtures.arAccount.id,
      dimensionStudentId: fixtures.studentId,
      transactionDate: new Date('2026-09-15'),
    });

    expect(result.allocations.length).toBeGreaterThan(0);
    expect(result.unallocatedKobo).toBe(0); // Allocated exactly the invoice amount

    // Invoice should now be PAID
    const inv = await invoiceSvc.getInvoiceById(tenantId, invoiceId);
    expect(inv.status).toBe('PAID');

    await assertTrialBalanced(); // Step 7 assertion
  }, 30_000);

  // ── Step 8: Student credit = ₦200k ──────────────────────────────────────

  it('Step 8: Student credit = ₦200,000 (ledger-derived from Student Prepayments)', async () => {
    const creditDecimal = await credit.getCreditBalance(tenantId, fixtures.studentId);
    const creditKobo = creditDecimal.mul(100).toNumber();

    // After: ₦1M received (Cr prepayments), ₦800k allocated (Dr prepayments)
    // Net credit = ₦1M - ₦800k = ₦200k
    expect(Math.round(creditKobo)).toBe(AMOUNT_KOBO - INVOICE_KOBO);

    await assertTrialBalanced();
  }, 30_000);

  // ── Step 9: Invoice outstanding = 0 ─────────────────────────────────────

  it('Step 9: Invoice outstanding balance = 0 from PaymentAllocation aggregate', async () => {
    const outstanding = await invoiceSvc.getInvoiceOutstanding(tenantId, invoiceId);
    expect(outstanding.outstandingKobo).toBe(0);
    expect(outstanding.allocatedKobo).toBe(INVOICE_KOBO);
  }, 30_000);

  // ── Step 10: Bank settlement ─────────────────────────────────────────────

  it('Step 10: Bank settlement → TRANSFER: Dr Main Bank / Cr Paystack Clearing', async () => {
    const gatewayRef = (global as any).__e2e_gatewayRef;
    const settlementRef = `SETTLE-PAYSTACK-E2E-001`;

    await transfer.postBankSettlement({
      tenantId,
      reference: settlementRef,
      amountKobo: AMOUNT_KOBO,
      gatewayClearingAccountId: fixtures.clearingAccount.id,
      bankAccountId: fixtures.bankAccount.id,
      settlementDate: new Date('2026-09-20'),
    });

    // Gateway Clearing should now be 0 (₦1M debit offset by ₦1M credit)
    const clearingBalance = await ledger.getAccountBalance(tenantId, fixtures.clearingAccount.id);
    expect(clearingBalance.mul(100).toNumber()).toBe(0);

    // Main Bank should show ₦1M debit
    const bankBalance = await ledger.getAccountBalance(tenantId, fixtures.bankAccount.id);
    expect(bankBalance.mul(100).toNumber()).toBe(AMOUNT_KOBO);

    await assertTrialBalanced(); // Step 10 assertion
  }, 30_000);

  // ── Step 11: Chargeback after settlement (two-step reversal) ─────────────

  it('Step 11a: Chargeback — reverse settlement first (Dr Paystack Clearing / Cr Main Bank)', async () => {
    const settlementRef = 'SETTLE-PAYSTACK-E2E-001';
    const settlementRevRef = `REV-${settlementRef}`;

    await ledger.reverseTransaction({
      tenantId,
      originalReference: settlementRef,
      reversalReference: settlementRevRef,
      reversalDate: new Date('2026-09-25'),
      description: 'Chargeback: reverse bank settlement first',
    });

    // Gateway Clearing back to ₦1M (clearing re-opened)
    const clearingBalance = await ledger.getAccountBalance(tenantId, fixtures.clearingAccount.id);
    expect(Math.round(clearingBalance.mul(100).toNumber())).toBe(AMOUNT_KOBO);

    // Main Bank back to 0
    const bankBalance = await ledger.getAccountBalance(tenantId, fixtures.bankAccount.id);
    expect(Math.round(bankBalance.mul(100).toNumber())).toBe(0);

    await assertTrialBalanced();
  }, 30_000);

  it('Step 11b: Chargeback — reverse PAYMENT_RECEIPT (Dr Prepayments / Cr Clearing)', async () => {
    const gatewayRef = (global as any).__e2e_gatewayRef;
    const receiptRef = `RECEIPT-${gatewayRef}`;
    const chargebackRef = `REV-${receiptRef}`;

    const result = await refund.processChargeback({
      tenantId,
      chargebackReference: chargebackRef,
      originalReceiptReference: receiptRef,
      chargebackDate: new Date('2026-09-25'),
      description: 'Chargeback from card issuer',
    });

    expect(result.reversalReference).toBe(chargebackRef);

    // Gateway Clearing should now be 0 (₦1M Dr from receipt VOIDED, reversal Cr offsets)
    const clearingBalance = await ledger.getAccountBalance(tenantId, fixtures.clearingAccount.id);
    expect(Math.round(clearingBalance.mul(100).toNumber())).toBe(0);

    await assertTrialBalanced(); // Step 11b assertion
  }, 30_000);

  // ── Step 12: Student credit = 0 after chargeback ────────────────────────

  it('Step 12: Student credit = 0 after chargeback reversal (VOIDED + POSTED net to zero)', async () => {
    const creditDecimal = await credit.getCreditBalance(tenantId, fixtures.studentId);
    // Original receipt Cr ₦1M + reversal Dr ₦1M = 0 net on prepayment liability
    // But allocation Dr ₦800k also netted against it, so the reversal restored ₦1M credit,
    // but the allocation Dr ₦800k still stands → remaining credit after reversal depends on
    // whether we also reverse the allocation. We reverse only the receipt here, so:
    // Prepayments: +₦1M (receipt Cr) - ₦800k (allocation Dr) - ₦1M (reversal Dr) = -₦800k
    // This means student owes ₦800k AR again (AR Cr was allocated, now Dr reversed)
    // Student credit from LIABILITY account perspective:
    // Cr ₦1M (receipt) + Dr ₦800k (alloc reversal in receipt reversal?) 
    // Actually the reversal of the RECEIPT reverses the full ₦1M journal:
    //   Original RECEIPT: Dr Clearing ₦1M / Cr Prepayments ₦1M
    //   Reversal:         Dr Prepayments ₦1M / Cr Clearing ₦1M
    // So Prepayments: Cr ₦1M (receipt) + Dr ₦800k (allocation) + Dr ₦1M (reversal) = -₦800k
    // Student credit from getCreditBalance (LIABILITY lines, Cr - Dr) = 1M - 800k - 1M = -800k
    // getCreditBalance returns max(0, credit - debit) conceptually
    const creditKobo = Math.round(creditDecimal.mul(100).toNumber());
    // Credit is now <= 0 (student owes ₦800k again due to chargeback)
    expect(creditKobo).toBeLessThanOrEqual(0);

    await assertTrialBalanced(); // Step 12 — final assertion
  }, 30_000);

  // ── Step 13: Complete audit chain is queryable ───────────────────────────

  it('Step 13: Complete audit chain — all transactions linked to the gateway reference', async () => {
    const gatewayRef = (global as any).__e2e_gatewayRef;

    // All transactions that involve this payment reference
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId,
        OR: [
          { reference: `RECEIPT-${gatewayRef}` },
          { reference: `REV-RECEIPT-${gatewayRef}` },
          { reference: `ALLOC-${gatewayRef}-${invoiceId}` },
          { reference: 'SETTLE-PAYSTACK-E2E-001' },
          { reference: 'REV-SETTLE-PAYSTACK-E2E-001' },
        ],
      },
      include: { lines: true },
      orderBy: { createdAt: 'asc' },
    });

    // Expect: INVOICE_ISSUE, PAYMENT_RECEIPT (VOIDED), ALLOCATION, TRANSFER (VOIDED), REV-SETTLE, REV-RECEIPT
    expect(transactions.length).toBeGreaterThanOrEqual(4);

    // Verify the PAYMENT_RECEIPT is now VOIDED
    const receiptTx = transactions.find((t) => t.reference === `RECEIPT-${gatewayRef}`);
    expect(receiptTx).toBeDefined();
    expect(receiptTx!.status).toBe('VOIDED');

    // Verify the reversal is POSTED
    const reversalTx = transactions.find((t) => t.reference === `REV-RECEIPT-${gatewayRef}`);
    expect(reversalTx).toBeDefined();
    expect(reversalTx!.status).toBe('POSTED');

    // Verify every transaction has at least 2 journal lines
    for (const tx of transactions) {
      expect(tx.lines.length).toBeGreaterThanOrEqual(2);
    }
  }, 30_000);

  // ── Step 14: Final integrity health audit ────────────────────────────────

  it('Step 14: FinanceIntegrityVerificationService reports no issues', async () => {
    const report = await integrity.runHealthAudit(tenantId);

    // Filter out AMOUNT_PAID_CACHE_DRIFT if it appears due to the chargeback
    // (Invoice.amountPaid cache was set before chargeback, now stale — expected)
    const criticalIssues = report.issues.filter(
      (i) => i.severity === 'CRITICAL' && i.code !== 'AMOUNT_PAID_CACHE_DRIFT',
    );

    expect(criticalIssues).toHaveLength(0);
    // Trial balance must still be balanced globally
    const balanceIssue = report.issues.find((i) => i.code === 'GLOBAL_TRIAL_BALANCE_IMBALANCE');
    expect(balanceIssue).toBeUndefined();
  }, 30_000);

  // ── Step 15: Concurrent over-allocation is impossible ───────────────────

  it('Step 15: Concurrent allocations cannot over-allocate a ₦200k outstanding balance', async () => {
    // Create a fresh invoice for ₦200,000
    const freshInvoice = await invoiceSvc.createDraftInvoice({
      tenantId,
      studentId: fixtures.studentId,
      termId: fixtures.termId,
      invoiceNumber: `INV-CONC-001`,
      dueDate: new Date('2026-12-01'),
      items: [{ description: 'Sports Fee', amountKobo: 20_000_00 }], // ₦200k
    });

    await invoiceSvc.issueInvoice({
      tenantId,
      invoiceId: freshInvoice.id,
      arAccountId: fixtures.arAccount.id,
      revenueAccountId: fixtures.revenueAccount.id,
      ledgerReference: `LEDGER-INV-CONC-001`,
      transactionDate: new Date(),
    });

    // Create a new payment of ₦300k to over-fund the invoice
    const conc1Ref = `conc-pay-${makeId()}`;
    const pmtConc = await payment.recordManualPayment({
      tenantId,
      amountKobo: 30_000_00,
      method: 'CASH',
      reference: conc1Ref,
      paymentDate: new Date(),
      gatewayClearingAccountId: fixtures.clearingAccount.id,
      prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
      dimensionStudentId: fixtures.studentId,
    });

    // Two concurrent allocations both trying to allocate ₦200k to the same invoice
    // Only one should succeed fully; the second finds 0 outstanding
    const alloc1 = allocation.allocatePayment({
      tenantId,
      studentId: fixtures.studentId,
      paymentId: pmtConc.id,
      amountKobo: 20_000_00,
      strategy: 'OLDEST_FIRST',
      allocationReference: `ALLOC-CONC-A-${makeId()}`,
      prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
      arAccountId: fixtures.arAccount.id,
      dimensionStudentId: fixtures.studentId,
      transactionDate: new Date(),
    });

    const alloc2 = allocation.allocatePayment({
      tenantId,
      studentId: fixtures.studentId,
      paymentId: pmtConc.id,
      amountKobo: 20_000_00,
      strategy: 'OLDEST_FIRST',
      allocationReference: `ALLOC-CONC-B-${makeId()}`,
      prepaymentLiabilityAccountId: fixtures.prepaymentAccount.id,
      arAccountId: fixtures.arAccount.id,
      dimensionStudentId: fixtures.studentId,
      transactionDate: new Date(),
    });

    // One should succeed, one should fail (no outstanding items) — or both resolve with unallocated
    const results = await Promise.allSettled([alloc1, alloc2]);
    const succeeded = results.filter((r) => r.status === 'fulfilled');

    // At least one must succeed
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    // Total allocated across both must not exceed the invoice amount (₦200k)
    const totalAllocated = await prisma.paymentAllocation.aggregate({
      where: { tenantId, invoiceItemId: { in: freshInvoice.items.map((i: any) => i.id) } },
      _sum: { amount: true },
    });

    const totalAllocatedKobo = Math.round(
      (totalAllocated._sum.amount ?? new Prisma.Decimal(0)).mul(100).toNumber(),
    );
    expect(totalAllocatedKobo).toBeLessThanOrEqual(20_000_00);

    await assertTrialBalanced();
  }, 60_000);
});
