import { PrismaClient, AccountingPeriod } from '../../../../prisma/generated/client';
import { FinanceError } from './errors';
import { FinanceIntegrityVerificationService } from './FinanceIntegrityVerificationService';

export class ClosingError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'ClosingError';
  }
}

export class FinancialClosingEngineService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly integrityService: FinanceIntegrityVerificationService
  ) {}

  /**
   * Transitions a period to SOFT_CLOSED.
   * Stops automated postings but allows manual adjustment workflows by managers.
   */
  async softClosePeriod(tenantId: string, periodId: string): Promise<AccountingPeriod> {
    return await this.prisma.$transaction(async (tx) => {
      const period = await tx.accountingPeriod.findUnique({ where: { id: periodId, tenantId } });
      if (!period) throw new ClosingError('Period not found');
      if (period.status !== 'OPEN') throw new ClosingError(`Cannot soft close a period that is ${period.status}`);

      // Run pre-close integrity check
      const auditReport = await this.integrityService.runHealthAudit(tenantId);
      if (!auditReport.isHealthy) {
        throw new ClosingError('Cannot close period: Internal integrity checks failed (e.g., trial balance non-zero or orphaned records exist).');
      }

      return await tx.accountingPeriod.update({
        where: { id: periodId },
        data: { status: 'SOFT_CLOSED' }
      });
    });
  }

  /**
   * Transitions a period to CLOSED. No postings allowed at all.
   */
  async hardClosePeriod(tenantId: string, periodId: string): Promise<AccountingPeriod> {
    return await this.prisma.$transaction(async (tx) => {
      const period = await tx.accountingPeriod.findUnique({ where: { id: periodId, tenantId } });
      if (!period) throw new ClosingError('Period not found');
      if (period.status !== 'SOFT_CLOSED') throw new ClosingError('Period must be SOFT_CLOSED before it can be strictly CLOSED.');

      // Run pre-close integrity check again
      const auditReport = await this.integrityService.runHealthAudit(tenantId);
      if (!auditReport.isHealthy) {
        throw new ClosingError('Cannot close period: Internal integrity checks failed.');
      }

      // Check for pending exceptions or approvals
      const pendingExceptions = await tx.reconciliationException.count({
        where: { tenantId, status: 'OPEN' }
      });
      if (pendingExceptions > 0) {
        throw new ClosingError(`Cannot close period: ${pendingExceptions} unresolved reconciliation exceptions exist.`);
      }

      const closedPeriod = await tx.accountingPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' }
      });

      // (Optional) Generate Retained Balance Snapshot here
      return closedPeriod;
    });
  }

  /**
   * Reopens a period. Requires an ApprovalWorkflow to be completed first.
   */
  async reopenPeriod(tenantId: string, periodId: string, approvalWorkflowId: string): Promise<AccountingPeriod> {
    const workflow = await this.prisma.approvalWorkflow.findUnique({
      where: { id: approvalWorkflowId, tenantId }
    });

    if (!workflow || workflow.status !== 'APPROVED' || workflow.type !== 'MANUAL_ADJUSTMENT') {
      throw new ClosingError('Period cannot be reopened without a valid, approved manual adjustment workflow.');
    }

    return await this.prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'OPEN' }
    });
  }

  /**
   * Freezes the year. No reopening permitted.
   */
  async yearEndClose(tenantId: string, periodId: string): Promise<AccountingPeriod> {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id: periodId, tenantId } });
    if (!period || period.status !== 'CLOSED') {
      throw new ClosingError('Only CLOSED periods can be marked YEAR_CLOSED.');
    }
    
    // In a real system, we'd also generate closing journal entries to zero out revenue/expense 
    // accounts into Retained Earnings.
    return await this.prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'YEAR_CLOSED' }
    });
  }
}
