/**
 * Phase 15.1A — Finance Integrity Test Suite
 *
 * Runs against the actual Neon test database (DATABASE_URL from env).
 * Each test uses a unique tenant + isolated data to avoid cross-test pollution.
 * No Docker/testcontainers required.
 *
 * Certified properties:
 * A. Double-entry balance: SUM(debit) = SUM(credit)
 * B. Negative amounts rejected
 * C. Invalid line combinations rejected (both +, both 0)
 * D. Unbalanced transactions rejected before commit
 * E. Duplicate references rejected (idempotency)
 * F. Posting to CLOSED period rejected
 * G. No period found → rejected
 * H. Reversal preserves original, creates exact mirror, original becomes VOIDED
 * J. Trial balance stays balanced after multiple transactions
 * K. Cross-tenant access rejected
 * L & M. Student credit is ledger-derived; overpayment becomes student credit
 * N. Concurrent duplicate requests — only one survives
 * O. Complete E2E: Invoice → Partial → Full → Overpayment → Reversal → Trial Balance
 */

import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { FinancialLedgerService } from './FinancialLedgerService';
import { StudentCreditService } from './StudentCreditService';
import {
  LedgerImbalanceError,
  DuplicateTransactionError,
  PeriodLockedError,
  NoPeriodFoundError,
  InvalidJournalLineError,
  TenantMismatchError,
} from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const D = (n: number | string) => new Prisma.Decimal(n);

/** Builds an isolated test fixture, using a unique slug so tests don't collide. */
async function buildFixture(prisma: PrismaClient, suffix: string) {
  const plan = await prisma.platformPlan.create({
    data: { name: `Plan-${suffix}`, price: 0, entitlements: {} },
  });

  const tenant = await prisma.tenant.create({
    data: { name: `School-${suffix}`, slug: `school-${suffix}`, status: 'ACTIVE', planId: plan.id },
  });

  const otherTenant = await prisma.tenant.create({
    data: { name: `Other-${suffix}`, slug: `other-${suffix}`, status: 'ACTIVE', planId: plan.id },
  });

  const [bank, clearing, ar, prepay, tuition] = await Promise.all([
    prisma.chartOfAccount.create({ data: { tenantId: tenant.id, code: '1001', name: 'Main Bank', type: 'ASSET' } }),
    prisma.chartOfAccount.create({ data: { tenantId: tenant.id, code: '1002', name: 'Paystack Clearing', type: 'ASSET' } }),
    prisma.chartOfAccount.create({ data: { tenantId: tenant.id, code: '1100', name: 'Accounts Receivable', type: 'ASSET' } }),
    prisma.chartOfAccount.create({ data: { tenantId: tenant.id, code: '2001', name: 'Student Prepayments', type: 'LIABILITY' } }),
    prisma.chartOfAccount.create({ data: { tenantId: tenant.id, code: '4001', name: 'Tuition Revenue', type: 'REVENUE' } }),
  ]);

  const period = await prisma.accountingPeriod.create({
    data: {
      tenantId: tenant.id,
      name: '2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'OPEN',
    },
  });

  // Minimal role required by TenantMembership FK
  const role = await prisma.role.create({
    data: { tenantId: tenant.id, name: 'STUDENT', isSystem: false },
  });

  // User.email is the only required field (passwordHash and emailVerified are optional)
  const user = await prisma.user.create({
    data: { email: `u-${suffix}@test.com` },
  });
  const membership = await prisma.tenantMembership.create({
    data: { tenantId: tenant.id, userId: user.id, roleId: role.id },
  });
  const student = await prisma.student.create({
    data: { tenantId: tenant.id, membershipId: membership.id, admissionNumber: `ADM-${suffix}` },
  });

  return {
    tenantId: tenant.id,
    otherTenantId: otherTenant.id,
    periodId: period.id,
    studentId: student.id,
    bankAccountId: bank.id,
    paystackClearingId: clearing.id,
    arAccountId: ar.id,
    prepaymentLiabilityId: prepay.id,
    tuitionRevenueId: tuition.id,
  };
}

/** Tears down all data for a tenant (in reverse dependency order). */
async function teardown(prisma: PrismaClient, tenantId: string, otherTenantId: string) {
  for (const tid of [tenantId, otherTenantId]) {
    await prisma.journalEntryLine.deleteMany({ where: { tenantId: tid } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId: tid } });
    await prisma.accountingPeriod.deleteMany({ where: { tenantId: tid } });
    await prisma.chartOfAccount.deleteMany({ where: { tenantId: tid } });
    await prisma.paymentAllocation.deleteMany({ where: { tenantId: tid } });
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.paymentAttempt.deleteMany({ where: { tenantId: tid } });
    await prisma.student.deleteMany({ where: { tenantId: tid } });
    await prisma.tenantMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.role.deleteMany({ where: { tenantId: tid } });
    await prisma.tenant.deleteMany({ where: { id: tid } });
  }
  // Clean up orphaned users created for the test (linked via email pattern)
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
}


// ─────────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 15.1A Finance Integrity Suite', () => {
  let prisma: PrismaClient;
  let ledger: FinancialLedgerService;
  let creditSvc: StudentCreditService;

  beforeAll(() => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL must be set to run finance integrity tests');
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    ledger = new FinancialLedgerService(prisma);
    creditSvc = new StudentCreditService(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // A. Double-entry balance
  // ─────────────────────────────────────────────────────────────────────────────

  describe('A. Balanced transaction is accepted; trial balance = zero', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('posts a balanced transaction and trial balance is zero', async () => {
      fx = await buildFixture(prisma, `a-${Date.now()}`);
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'INV-A1', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(50000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),    credit: D(50000) },
        ],
      });
      const tb = await ledger.getTrialBalance(fx.tenantId);
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalDebits.toString()).toBe('50000');
      expect(tb.totalCredits.toString()).toBe('50000');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // B. Negative amounts rejected
  // ─────────────────────────────────────────────────────────────────────────────

  describe('B. Negative amounts rejected', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('rejects negative debit', async () => {
      fx = await buildFixture(prisma, `b1-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'NEG-D', type: 'PAYMENT_RECEIPT', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.bankAccountId, debit: D(-100), credit: D(0) },
          { accountId: fx.arAccountId,   debit: D(0),    credit: D(-100) },
        ],
      })).rejects.toThrow(InvalidJournalLineError);
    });

    it('rejects negative credit', async () => {
      fx = await buildFixture(prisma, `b2-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'NEG-C', type: 'PAYMENT_RECEIPT', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.bankAccountId, debit: D(100), credit: D(0) },
          { accountId: fx.arAccountId,   debit: D(0),   credit: D(-100) },
        ],
      })).rejects.toThrow(InvalidJournalLineError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // C. Invalid line combinations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('C. Invalid line combinations rejected', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('rejects both debit and credit > 0 on same line', async () => {
      fx = await buildFixture(prisma, `c1-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'BOTH-POS', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,     debit: D(100), credit: D(100) },
          { accountId: fx.tuitionRevenueId, debit: D(0),   credit: D(100) },
        ],
      })).rejects.toThrow(InvalidJournalLineError);
    });

    it('rejects both debit and credit == 0 on same line', async () => {
      fx = await buildFixture(prisma, `c2-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'BOTH-ZERO', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(0), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0), credit: D(100) },
        ],
      })).rejects.toThrow(InvalidJournalLineError);
    });

    it('rejects a transaction with fewer than 2 lines', async () => {
      fx = await buildFixture(prisma, `c3-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'ONE-LINE', type: 'PAYMENT_RECEIPT', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [{ accountId: fx.bankAccountId, debit: D(100), credit: D(0) }],
      })).rejects.toThrow(InvalidJournalLineError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // D. Unbalanced transaction rejected before commit
  // ─────────────────────────────────────────────────────────────────────────────

  describe('D. Unbalanced transaction rejected, nothing persisted', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('rejects when debits != credits and persists nothing', async () => {
      fx = await buildFixture(prisma, `d-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'IMBAL-001', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(500), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),   credit: D(400) },
        ],
      })).rejects.toThrow(LedgerImbalanceError);

      const count = await prisma.financialTransaction.count({ where: { tenantId: fx.tenantId } });
      expect(count).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // E. Duplicate reference rejected (idempotency)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('E. Duplicate reference rejected — exactly 1 record persists', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('second call with same reference throws DuplicateTransactionError', async () => {
      fx = await buildFixture(prisma, `e-${Date.now()}`);
      const payload = {
        tenantId: fx.tenantId, reference: 'PAY-DUP', type: 'PAYMENT_RECEIPT' as const, source: 'GATEWAY',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.paystackClearingId,    debit: D(10000), credit: D(0) },
          { accountId: fx.prepaymentLiabilityId, debit: D(0),     credit: D(10000) },
        ],
      };
      await ledger.recordTransaction(payload);
      await expect(ledger.recordTransaction(payload)).rejects.toThrow(DuplicateTransactionError);

      const count = await prisma.financialTransaction.count({
        where: { tenantId: fx.tenantId, reference: 'PAY-DUP' },
      });
      expect(count).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // F. Closed period rejects posting
  // ─────────────────────────────────────────────────────────────────────────────

  describe('F. Closed period rejects new postings', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('throws PeriodLockedError when period status is CLOSED', async () => {
      fx = await buildFixture(prisma, `f-${Date.now()}`);
      await prisma.accountingPeriod.update({
        where: { id: fx.periodId },
        data: { status: 'CLOSED', closedAt: new Date() },
      });
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'POST-LOCKED', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(1000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),    credit: D(1000) },
        ],
      })).rejects.toThrow(PeriodLockedError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // G. No period found
  // ─────────────────────────────────────────────────────────────────────────────

  describe('G. No matching period → NoPeriodFoundError', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('throws when date is outside all periods', async () => {
      fx = await buildFixture(prisma, `g-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'NO-PERIOD', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2020-01-01'), // before all periods
        lines: [
          { accountId: fx.arAccountId,      debit: D(1000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),    credit: D(1000) },
        ],
      })).rejects.toThrow(NoPeriodFoundError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // H. Reversal preserves original, creates exact mirror
  // ─────────────────────────────────────────────────────────────────────────────

  describe('H. Reversal creates mirror; original becomes VOIDED', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('reversal lines are exact opposite; original is VOIDED; trial balance is zero', async () => {
      fx = await buildFixture(prisma, `h-${Date.now()}`);

      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'INV-H1', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(30000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),    credit: D(30000) },
        ],
      });

      await ledger.reverseTransaction({
        tenantId: fx.tenantId,
        originalReference: 'INV-H1',
        reversalReference: 'INV-H1-REV',
        reversalDate: new Date('2026-06-05'),
      });

      const original = await prisma.financialTransaction.findFirst({
        where: { reference: 'INV-H1', tenantId: fx.tenantId },
        include: { lines: true },
      });
      expect(original!.status).toBe('VOIDED');

      const reversal = await prisma.financialTransaction.findFirst({
        where: { reference: 'INV-H1-REV', tenantId: fx.tenantId },
        include: { lines: true },
      });
      expect(reversal!.status).toBe('POSTED');
      expect(reversal!.type).toBe('REVERSAL');

      const revAr = reversal!.lines.find((l) => l.accountId === fx.arAccountId)!;
      expect(revAr.credit.toString()).toBe('30000'); // was debit, now credit
      expect(revAr.debit.toString()).toBe('0');

      // Both the VOIDED original and the POSTED reversal are counted — they net to zero per account.
      // Total ledger: original posted 30k Dr + 30k Cr, reversal posted 30k Dr + 30k Cr → 60k/60k balanced.
      const tb = await ledger.getTrialBalance(fx.tenantId);
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalDebits.toString()).toBe('60000');
      expect(tb.totalCredits.toString()).toBe('60000');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // J. Trial balance stays balanced
  // ─────────────────────────────────────────────────────────────────────────────

  describe('J. Trial balance stays balanced across many transactions', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('remains balanced after 3 independent postings', async () => {
      fx = await buildFixture(prisma, `j-${Date.now()}`);

      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'J-INV-1', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(100000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),     credit: D(100000) },
        ],
      });
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'J-PAY-1', type: 'PAYMENT_RECEIPT', source: 'GATEWAY',
        transactionDate: new Date('2026-06-10'),
        lines: [
          { accountId: fx.paystackClearingId, debit: D(60000), credit: D(0) },
          { accountId: fx.arAccountId,        debit: D(0),     credit: D(60000) },
        ],
      });
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'J-SETTLE-1', type: 'TRANSFER', source: 'BANK',
        transactionDate: new Date('2026-06-15'),
        lines: [
          { accountId: fx.bankAccountId,      debit: D(60000), credit: D(0) },
          { accountId: fx.paystackClearingId,  debit: D(0),    credit: D(60000) },
        ],
      });

      const tb = await ledger.getTrialBalance(fx.tenantId);
      expect(tb.isBalanced).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // K. Cross-tenant access rejected
  // ─────────────────────────────────────────────────────────────────────────────

  describe('K. Cross-tenant access is impossible', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('cannot post using another tenants account IDs (no period found)', async () => {
      fx = await buildFixture(prisma, `k1-${Date.now()}`);
      await expect(ledger.recordTransaction({
        tenantId: fx.otherTenantId,  // wrong tenant
        reference: 'CROSS-TENANT',
        type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(1000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),    credit: D(1000) },
        ],
      })).rejects.toThrow(); // NoPeriodFoundError — otherTenant has no period
    });

    it('cannot read balance of another tenants account', async () => {
      fx = await buildFixture(prisma, `k2-${Date.now()}`);
      await expect(
        ledger.getAccountBalance(fx.otherTenantId, fx.arAccountId),
      ).rejects.toThrow(TenantMismatchError);
    });

    it('cannot read credit of a student belonging to another tenant', async () => {
      fx = await buildFixture(prisma, `k3-${Date.now()}`);
      await expect(
        creditSvc.getCreditBalance(fx.otherTenantId, fx.studentId),
      ).rejects.toThrow(TenantMismatchError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // L & M. Student credit is ledger-derived; overpayment becomes credit
  // ─────────────────────────────────────────────────────────────────────────────

  describe('L & M. Overpayment becomes student credit, derived from ledger', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('calculates credit from liability lines and reduces it on allocation', async () => {
      fx = await buildFixture(prisma, `lm-${Date.now()}`);

      // Invoice ₦50,000
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'LM-INV', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(50000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),    credit: D(50000) },
        ],
      });

      // Payment ₦70,000 — ₦50k to AR, ₦20k as student prepayment
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'LM-PAY', type: 'PAYMENT_RECEIPT', source: 'GATEWAY',
        transactionDate: new Date('2026-06-05'),
        lines: [
          { accountId: fx.paystackClearingId,    debit: D(70000), credit: D(0) },
          { accountId: fx.arAccountId,           debit: D(0), credit: D(50000) },
          { accountId: fx.prepaymentLiabilityId, debit: D(0), credit: D(20000), dimensionStudentId: fx.studentId },
        ],
      });

      const bal1 = await creditSvc.getCreditBalance(fx.tenantId, fx.studentId);
      expect(bal1.toString()).toBe('20000');

      const summary = await creditSvc.getCreditSummary(fx.tenantId, fx.studentId);
      expect(summary.availableCredit.toString()).toBe('20000');
      expect(summary.totalPrepaid.toString()).toBe('20000');
      expect(summary.totalAllocated.toString()).toBe('0');

      // Allocate ₦15,000 of credit
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'LM-ALLOC', type: 'ALLOCATION', source: 'SYSTEM',
        transactionDate: new Date('2026-06-10'),
        lines: [
          { accountId: fx.prepaymentLiabilityId, debit: D(15000), credit: D(0), dimensionStudentId: fx.studentId },
          { accountId: fx.arAccountId,           debit: D(0), credit: D(15000) },
        ],
      });

      const bal2 = await creditSvc.getCreditBalance(fx.tenantId, fx.studentId);
      expect(bal2.toString()).toBe('5000'); // ₦20k - ₦15k

      const tb = await ledger.getTrialBalance(fx.tenantId);
      expect(tb.isBalanced).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // N. Concurrent duplicate requests — only one survives
  // ─────────────────────────────────────────────────────────────────────────────

  describe('N. Concurrent duplicate requests handled safely', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('exactly one transaction survives a race condition', async () => {
      fx = await buildFixture(prisma, `n-${Date.now()}`);
      const payload = {
        tenantId: fx.tenantId, reference: 'CONCURRENT-001',
        type: 'PAYMENT_RECEIPT' as const, source: 'GATEWAY',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.paystackClearingId,    debit: D(5000), credit: D(0) },
          { accountId: fx.prepaymentLiabilityId, debit: D(0),    credit: D(5000) },
        ],
      };

      const results = await Promise.allSettled([
        ledger.recordTransaction({ ...payload }),
        ledger.recordTransaction({ ...payload }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures  = results.filter((r) => r.status === 'rejected');
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);

      const count = await prisma.financialTransaction.count({
        where: { tenantId: fx.tenantId, reference: 'CONCURRENT-001' },
      });
      expect(count).toBe(1);

      const tb = await ledger.getTrialBalance(fx.tenantId);
      expect(tb.isBalanced).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // O. Complete E2E workflow
  // ─────────────────────────────────────────────────────────────────────────────

  describe('O. Complete E2E — every naira is accounted for', () => {
    let fx: Awaited<ReturnType<typeof buildFixture>>;
    afterEach(() => fx && teardown(prisma, fx.tenantId, fx.otherTenantId));

    it('Invoice → Partial → Full + Overpayment → Settlement → Reversal → Trial Balance', async () => {
      fx = await buildFixture(prisma, `e2e-${Date.now()}`);

      // 1. Invoice ₦80,000
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'E2E-INV', type: 'INVOICE_ISSUE', source: 'SYSTEM',
        transactionDate: new Date('2026-06-01'),
        lines: [
          { accountId: fx.arAccountId,      debit: D(80000), credit: D(0) },
          { accountId: fx.tuitionRevenueId,  debit: D(0),    credit: D(80000) },
        ],
      });

      // 2. Partial payment ₦50,000
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'E2E-PAY1', type: 'PAYMENT_RECEIPT', source: 'GATEWAY',
        transactionDate: new Date('2026-06-10'),
        lines: [
          { accountId: fx.paystackClearingId, debit: D(50000), credit: D(0) },
          { accountId: fx.arAccountId,        debit: D(0),     credit: D(50000) },
        ],
      });

      const ar1 = await ledger.getAccountBalance(fx.tenantId, fx.arAccountId);
      expect(ar1.toString()).toBe('30000'); // ₦80k - ₦50k outstanding

      // 3. Second payment ₦40,000 — ₦30k clears AR, ₦10k is overpayment → prepayment
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'E2E-PAY2', type: 'PAYMENT_RECEIPT', source: 'GATEWAY',
        transactionDate: new Date('2026-06-20'),
        lines: [
          { accountId: fx.paystackClearingId,    debit: D(40000), credit: D(0) },
          { accountId: fx.arAccountId,           debit: D(0), credit: D(30000) },
          { accountId: fx.prepaymentLiabilityId, debit: D(0), credit: D(10000), dimensionStudentId: fx.studentId },
        ],
      });

      const ar2 = await ledger.getAccountBalance(fx.tenantId, fx.arAccountId);
      expect(ar2.toString()).toBe('0'); // Fully settled

      const sc = await creditSvc.getCreditBalance(fx.tenantId, fx.studentId);
      expect(sc.toString()).toBe('10000'); // ₦10k student credit

      // 4. Bank settlement: Paystack → GTBank (₦90k total received)
      await ledger.recordTransaction({
        tenantId: fx.tenantId, reference: 'E2E-SETTLE', type: 'TRANSFER', source: 'BANK',
        transactionDate: new Date('2026-06-25'),
        lines: [
          { accountId: fx.bankAccountId,      debit: D(90000), credit: D(0) },
          { accountId: fx.paystackClearingId,  debit: D(0),    credit: D(90000) },
        ],
      });

      const clearing = await ledger.getAccountBalance(fx.tenantId, fx.paystackClearingId);
      expect(clearing.toString()).toBe('0'); // Gateway fully cleared

      // 5. Reverse PAY2 (chargeback / dispute)
      await ledger.reverseTransaction({
        tenantId: fx.tenantId,
        originalReference: 'E2E-PAY2',
        reversalReference: 'E2E-PAY2-REV',
        reversalDate: new Date('2026-06-28'),
        description: 'Chargeback dispute',
      });

      // Student credit must be 0 after reversal voids the overpayment
      const sc2 = await creditSvc.getCreditBalance(fx.tenantId, fx.studentId);
      expect(sc2.toString()).toBe('0');

      // 6. Final trial balance
      const tb = await ledger.getTrialBalance(fx.tenantId);
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalDebits.equals(tb.totalCredits)).toBe(true);

      // 7. Ledger history is explainable
      const history = await ledger.getAccountLedger(fx.tenantId, fx.arAccountId);
      expect(history.history.length).toBeGreaterThan(0);
    });
  });
});
