import { PrismaClient, BankStatement, BankStatementLine, ReconciliationException } from '../../../../prisma/generated/client';
import { FinanceError } from './errors';

export class ReconciliationError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'ReconciliationError';
  }
}

export class ReconciliationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Imports a raw bank statement and initiates the auto-match run.
   */
  async importBankStatement(params: {
    tenantId: string;
    providerId: string;
    statementDate: Date;
    openingBalance: number;
    closingBalance: number;
    lines: Array<{
      transactionDate: Date;
      amount: number;
      reference?: string;
      description?: string;
    }>;
  }): Promise<BankStatement> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create the statement wrapper
      const statement = await tx.bankStatement.create({
        data: {
          tenantId: params.tenantId,
          providerId: params.providerId,
          statementDate: params.statementDate,
          openingBalance: params.openingBalance,
          closingBalance: params.closingBalance,
          status: 'UPLOADED',
          lines: {
            create: params.lines.map(line => ({
              tenantId: params.tenantId,
              transactionDate: line.transactionDate,
              amount: line.amount,
              reference: line.reference,
              description: line.description,
              reconciled: false,
            }))
          }
        },
        include: { lines: true }
      });

      return statement;
    });
  }

  /**
   * Runs the auto-match rules engine against an uploaded statement.
   * Matches lines to Payments. Exceptions are surfaced as MatchCandidates.
   */
  async runAutoReconciliation(params: {
    tenantId: string;
    statementId: string;
  }): Promise<{ matchedCount: number; exceptionCount: number }> {
    return await this.prisma.$transaction(async (tx) => {
      const statement = await tx.bankStatement.findUnique({
        where: { id: params.statementId, tenantId: params.tenantId },
        include: { lines: true }
      });

      if (!statement) throw new ReconciliationError('Statement not found');
      if (statement.status === 'RECONCILED') throw new ReconciliationError('Already reconciled');

      let matchedCount = 0;
      let exceptionCount = 0;

      for (const line of statement.lines) {
        if (line.reconciled) continue;
        if (!line.reference) {
          await this.flagException(tx, params.tenantId, line.id, 'MISSING_REFERENCE');
          exceptionCount++;
          continue;
        }

        // Search for matching payment
        const payments = await tx.payment.findMany({
          where: { 
            tenantId: params.tenantId,
            reference: line.reference,
            providerId: statement.providerId
          }
        });

        if (payments.length === 0) {
          await this.flagException(tx, params.tenantId, line.id, 'PAYMENT_NOT_FOUND');
          exceptionCount++;
        } else if (payments.length > 1) {
          await this.flagException(tx, params.tenantId, line.id, 'DUPLICATE_PAYMENT_REFERENCES');
          exceptionCount++;
        } else {
          const payment = payments[0];
          
          if (Number(payment.amount) !== Number(line.amount)) {
            await this.flagException(tx, params.tenantId, line.id, 'AMOUNT_MISMATCH');
            exceptionCount++;
          } else {
            // Perfect Match!
            await tx.bankStatementLine.update({
              where: { id: line.id },
              data: { reconciled: true }
            });
            matchedCount++;
          }
        }
      }

      // Record the Run
      await tx.reconciliationRun.create({
        data: {
          tenantId: params.tenantId,
          statementId: statement.id,
          status: 'COMPLETED',
          matchedCount,
          exceptionCount
        }
      });

      // Update Statement Status
      const finalStatus = exceptionCount === 0 ? 'RECONCILED' : 'EXCEPTIONS';
      await tx.bankStatement.update({
        where: { id: statement.id },
        data: { status: finalStatus }
      });

      return { matchedCount, exceptionCount };
    });
  }

  private async flagException(tx: any, tenantId: string, lineId: string, reason: string): Promise<void> {
    await tx.reconciliationException.create({
      data: {
        tenantId,
        lineId,
        reason,
        status: 'OPEN'
      }
    });
  }

  /**
   * Manually resolve an exception by forcing a match to a specific Payment.
   */
  async resolveException(params: {
    tenantId: string;
    exceptionId: string;
    targetPaymentId: string; // The selected match candidate
    resolutionNote: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const exception = await tx.reconciliationException.findUnique({
        where: { id: params.exceptionId, tenantId: params.tenantId },
        include: { line: true }
      });

      if (!exception) throw new ReconciliationError('Exception not found');

      // 1. Mark line as reconciled
      await tx.bankStatementLine.update({
        where: { id: exception.lineId },
        data: { reconciled: true }
      });

      // 2. Mark exception resolved
      await tx.reconciliationException.update({
        where: { id: exception.id },
        data: { status: 'RESOLVED' }
      });

      // 3. Link the payment and the line (via an audit trail or linking table)
      // In a full implementation, Payment should have a field `reconciledLineId` or similar.
      // E.g. tx.payment.update(...)
    });
  }
}
