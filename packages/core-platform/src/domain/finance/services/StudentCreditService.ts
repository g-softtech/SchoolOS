import { PrismaClient, Prisma } from '../../../../prisma/generated/client';
import { TenantMismatchError } from './errors';

export interface StudentCreditSummary {
  studentId: string;
  tenantId: string;
  /** Total ever paid into prepayment account */
  totalPrepaid: Prisma.Decimal;
  /** Total allocated out of prepayment account */
  totalAllocated: Prisma.Decimal;
  /** Current available credit = totalPrepaid - totalAllocated */
  availableCredit: Prisma.Decimal;
}

export interface StudentCreditHistoryEntry {
  date: Date;
  reference: string;
  description: string | null;
  memo: string | null;
  /** Positive = credit added, Negative = credit used */
  movement: Prisma.Decimal;
  runningBalance: Prisma.Decimal;
}

/**
 * StudentCreditService
 *
 * Derives a student's credit/prepayment balance entirely from the ledger.
 * Never stores a mutable wallet balance.
 *
 * A student prepayment is recorded as:
 *   Dr  Bank/Cash Account
 *   Cr  Student Prepayments (Liability)  [dimensionStudentId = student.id]
 *
 * When credit is used (allocated to an invoice):
 *   Dr  Student Prepayments (Liability)  [dimensionStudentId = student.id]
 *   Cr  Accounts Receivable             [dimensionInvoiceId = invoice.id]
 */
export class StudentCreditService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Returns the current credit balance for a student, derived from the ledger.
   * Credit balance = SUM(credit) - SUM(debit) on the Student Prepayments account
   * filtered by dimensionStudentId.
   *
   * Student Prepayments is a LIABILITY account (credit-normal).
   * So available credit = credits_posted - debits_posted.
   */
  async getCreditBalance(tenantId: string, studentId: string): Promise<Prisma.Decimal> {
    await this.assertStudentBelongsToTenant(tenantId, studentId);

    // Include VOIDED + POSTED lines. A reversed prepayment has:
    //   Original (VOIDED): Cr ₦X on this liability account
    //   Reversal (POSTED): Dr ₦X on this liability account
    // Both must be counted so they net to zero after reversal.
    const result = await this.prisma.journalEntryLine.aggregate({
      where: {
        tenantId,
        dimensionStudentId: studentId,
        // Only look at lines on LIABILITY accounts (prepayment liability lines)
        account: { type: 'LIABILITY' },
      },
      _sum: { debit: true, credit: true },
    });

    const credits = result._sum.credit ?? new Prisma.Decimal(0);
    const debits = result._sum.debit ?? new Prisma.Decimal(0);

    // LIABILITY is credit-normal: balance = credits - debits
    return credits.minus(debits);
  }

  /**
   * Returns a complete credit summary for the student.
   */
  async getCreditSummary(tenantId: string, studentId: string): Promise<StudentCreditSummary> {
    await this.assertStudentBelongsToTenant(tenantId, studentId);

    const prepaidResult = await this.prisma.journalEntryLine.aggregate({
      where: {
        tenantId,
        dimensionStudentId: studentId,
        account: { type: 'LIABILITY' },
        credit: { gt: 0 },
        // Include VOIDED — paired with reversal Dr, they net to zero
      },
      _sum: { credit: true },
    });

    const allocatedResult = await this.prisma.journalEntryLine.aggregate({
      where: {
        tenantId,
        dimensionStudentId: studentId,
        account: { type: 'LIABILITY' },
        debit: { gt: 0 },
      },
      _sum: { debit: true },
    });

    const totalPrepaid = prepaidResult._sum.credit ?? new Prisma.Decimal(0);
    const totalAllocated = allocatedResult._sum.debit ?? new Prisma.Decimal(0);
    const availableCredit = totalPrepaid.minus(totalAllocated);

    return { studentId, tenantId, totalPrepaid, totalAllocated, availableCredit };
  }

  /**
   * Returns a paginated credit history for the student with a running balance.
   * Useful for parent-facing "Wallet" statements.
   */
  async getCreditHistory(
    tenantId: string,
    studentId: string,
  ): Promise<StudentCreditHistoryEntry[]> {
    await this.assertStudentBelongsToTenant(tenantId, studentId);

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        dimensionStudentId: studentId,
        account: { type: 'LIABILITY' },
        // Include VOIDED — reversal pairs net to zero
      },
      include: {
        transaction: {
          select: { transactionDate: true, reference: true, description: true },
        },
      },
      orderBy: [{ transaction: { transactionDate: 'asc' } }, { createdAt: 'asc' }],
    });

    let running = new Prisma.Decimal(0);
    return lines.map((line) => {
      // For a liability (credit-normal): credit = money in, debit = money out
      const movement = line.credit.minus(line.debit);
      running = running.plus(movement);
      return {
        date: line.transaction.transactionDate,
        reference: line.transaction.reference,
        description: line.transaction.description,
        memo: line.memo,
        movement,
        runningBalance: running,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------

  private async assertStudentBelongsToTenant(
    tenantId: string,
    studentId: string,
  ): Promise<void> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!student) {
      throw new TenantMismatchError(
        `Student ${studentId} does not belong to tenant ${tenantId}`,
      );
    }
  }
}
