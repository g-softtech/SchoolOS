import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { FinancialLedgerService } from './FinancialLedgerService';
import { LedgerImbalanceError, DuplicateTransactionError, PeriodLockedError } from './errors';
import { execSync } from 'child_process';
import path from 'path';

describe('FinancialLedgerService (Integration - PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let service: FinancialLedgerService;
  
  // Test data references
  let tenantId: string;
  let chartOfAccountsId: string;
  let assetAccountId: string;
  let revenueAccountId: string;
  let periodId: string;

  beforeAll(async () => {
    // 1. Spin up PostgreSQL container
    container = await new PostgreSqlContainer('postgres:15-alpine').start();
    const databaseUrl = container.getConnectionUri();

    // 2. Set environment variable for Prisma
    process.env.DATABASE_URL = databaseUrl;

    // 3. Run Prisma migrations / push schema
    const schemaPath = path.resolve(__dirname, '../../../../prisma/schema.prisma');
    execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'ignore'
    });

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    service = new FinancialLedgerService(prisma);
  }, 60000); // Allow 60 seconds for container startup

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    // Clean up data between tests if needed, or rely on unique IDs
    await prisma.financialTransaction.deleteMany();
    await prisma.journalEntryLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.accountingPeriod.deleteMany();
    await prisma.gLAccount.deleteMany();
    await prisma.chartOfAccounts.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.platformPlan.deleteMany();

    // Seed base test data
    const plan = await prisma.platformPlan.create({
      data: {
        name: 'Test Plan',
        price: 0,
        entitlements: {}
      }
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test School',
        slug: `test-school-${Date.now()}`,
        status: 'ACTIVE',
        planId: plan.id
      }
    });
    tenantId = tenant.id;

    const coa = await prisma.chartOfAccounts.create({
      data: { tenantId, name: 'Test CoA' }
    });
    chartOfAccountsId = coa.id;

    const assetAcc = await prisma.gLAccount.create({
      data: { tenantId, chartOfAccountsId, code: '1000', name: 'Accounts Receivable', type: 'ASSET' }
    });
    assetAccountId = assetAcc.id;

    const revAcc = await prisma.gLAccount.create({
      data: { tenantId, chartOfAccountsId, code: '4000', name: 'Tuition Revenue', type: 'REVENUE' }
    });
    revenueAccountId = revAcc.id;

    const period = await prisma.accountingPeriod.create({
      data: {
        tenantId,
        name: 'Test Period',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'OPEN'
      }
    });
    periodId = period.id;
  });

  describe('A. Journal immutability & B. Trial balance', () => {
    it('should strictly balance Debits and Credits and prevent imbalance', async () => {
      const payload = {
        tenantId,
        transactionRef: 'TXN-100',
        type: 'INVOICE',
        source: 'SYSTEM',
        date: new Date('2026-06-01'),
        lines: [
          { accountId: assetAccountId, debit: new Prisma.Decimal(500), credit: new Prisma.Decimal(0) },
          { accountId: revenueAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(400) }, // Imbalanced!
        ]
      };

      await expect(service.recordTransaction(payload)).rejects.toThrow(LedgerImbalanceError);
      
      // Ensure nothing was posted
      const txnCount = await prisma.financialTransaction.count();
      expect(txnCount).toBe(0);
    });

    it('should post a balanced transaction successfully', async () => {
      const payload = {
        tenantId,
        transactionRef: 'TXN-101',
        type: 'INVOICE',
        source: 'SYSTEM',
        date: new Date('2026-06-01'),
        lines: [
          { accountId: assetAccountId, debit: new Prisma.Decimal(500), credit: new Prisma.Decimal(0) },
          { accountId: revenueAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(500) },
        ]
      };

      const { transaction, journalEntry } = await service.recordTransaction(payload);
      
      expect(transaction).toBeDefined();
      expect(transaction.status).toBe('COMPLETED');
      expect(journalEntry.lines).toHaveLength(2);

      // B. Trial balance check
      const totalDebits = journalEntry.lines.reduce((sum, l) => sum.plus(l.debit), new Prisma.Decimal(0));
      const totalCredits = journalEntry.lines.reduce((sum, l) => sum.plus(l.credit), new Prisma.Decimal(0));
      expect(totalDebits.equals(totalCredits)).toBe(true);
    });
  });

  describe('C. Accounting period locking', () => {
    it('should prevent posting to a LOCKED period', async () => {
      await prisma.accountingPeriod.update({
        where: { id: periodId },
        data: { status: 'LOCKED' }
      });

      const payload = {
        tenantId,
        transactionRef: 'TXN-LOCKED',
        type: 'INVOICE',
        source: 'SYSTEM',
        date: new Date('2026-06-01'),
        lines: [
          { accountId: assetAccountId, debit: new Prisma.Decimal(500), credit: new Prisma.Decimal(0) },
          { accountId: revenueAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(500) },
        ]
      };

      await expect(service.recordTransaction(payload)).rejects.toThrow(PeriodLockedError);
    });
  });

  describe('D. Duplicate webhook protection (Idempotency)', () => {
    it('should gracefully reject exact duplicate transactions using transactionRef', async () => {
      const payload = {
        tenantId,
        transactionRef: 'TXN-DUP',
        type: 'PAYMENT',
        source: 'GATEWAY',
        date: new Date('2026-06-02'),
        lines: [
          { accountId: assetAccountId, debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0) },
          { accountId: revenueAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100) },
        ]
      };

      // First call succeeds
      await service.recordTransaction(payload);

      // Second call with same ref fails with specific DuplicateError
      await expect(service.recordTransaction(payload)).rejects.toThrow(DuplicateTransactionError);
      
      const txns = await prisma.financialTransaction.findMany({ where: { transactionRef: 'TXN-DUP' } });
      expect(txns).toHaveLength(1);
    });
  });

  describe('J. As-of-date balances', () => {
    it('should correctly derive historical balances ignoring future entries', async () => {
      // Post an entry in June
      await service.recordTransaction({
        tenantId,
        transactionRef: 'TXN-JUNE',
        type: 'INVOICE',
        source: 'SYSTEM',
        date: new Date('2026-06-15'),
        lines: [
          { accountId: assetAccountId, debit: new Prisma.Decimal(1000), credit: new Prisma.Decimal(0) },
          { accountId: revenueAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(1000) },
        ]
      });

      // Post an entry in August
      await service.recordTransaction({
        tenantId,
        transactionRef: 'TXN-AUG',
        type: 'PAYMENT',
        source: 'SYSTEM',
        date: new Date('2026-08-01'),
        lines: [
          { accountId: revenueAccountId, debit: new Prisma.Decimal(200), credit: new Prisma.Decimal(0) },
          { accountId: assetAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(200) },
        ]
      });

      // Balance as of June 30 should be 1000
      const juneBalance = await service.getAccountBalance(tenantId, assetAccountId, new Date('2026-06-30'));
      expect(juneBalance.toString()).toBe('1000');

      // Balance as of Aug 30 should be 800
      const augBalance = await service.getAccountBalance(tenantId, assetAccountId, new Date('2026-08-30'));
      expect(augBalance.toString()).toBe('800');
    });
  });
  
  describe('Explainability', () => {
    it('should provide an explainable audit trail for a balance', async () => {
      await service.recordTransaction({
        tenantId,
        transactionRef: 'TXN-1',
        type: 'INVOICE',
        source: 'SYSTEM',
        date: new Date('2026-06-01'),
        lines: [
          { accountId: assetAccountId, debit: new Prisma.Decimal(500), credit: new Prisma.Decimal(0), memo: 'Invoice 1' },
          { accountId: revenueAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(500) },
        ]
      });
      await service.recordTransaction({
        tenantId,
        transactionRef: 'TXN-2',
        type: 'PAYMENT',
        source: 'SYSTEM',
        date: new Date('2026-06-05'),
        lines: [
          { accountId: revenueAccountId, debit: new Prisma.Decimal(200), credit: new Prisma.Decimal(0) },
          { accountId: assetAccountId, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(200), memo: 'Partial Payment' },
        ]
      });

      const explanation = await service.explainBalance(tenantId, assetAccountId);
      expect(explanation.currentBalance).toBe('300');
      expect(explanation.history).toHaveLength(2);
      expect(explanation.history[0].runningBalance).toBe('500');
      expect(explanation.history[0].memo).toBe('Invoice 1');
      expect(explanation.history[1].runningBalance).toBe('300');
      expect(explanation.history[1].memo).toBe('Partial Payment');
    });
  });
});
