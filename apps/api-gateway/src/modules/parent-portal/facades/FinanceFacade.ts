import { Injectable } from '@nestjs/common';
import { FinancialReportingReadService, PrismaClient } from '@saas/core-platform';
import { FamilyContext } from '../auth/FamilyContext';
import { FamilyFinanceSummaryView, ChildFinanceSummary } from '../dto/ViewModels';

@Injectable()
export class FinanceFacade {
  constructor(
    private readonly reportingService: FinancialReportingReadService,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Adapts the internal Finance reporting services into the Parent-Friendly ViewModel.
   * Enforces the "Parent Experience Principle" — returns explainability strings
   * rather than raw math.
   */
  async getFamilyFinanceSummary(
    context: FamilyContext,
    correlationId: string,
  ): Promise<Omit<FamilyFinanceSummaryView, 'sourceStatus' | 'correlationId' | 'generatedAt'>> {
    const children: ChildFinanceSummary[] = [];
    let familyTotalOutstanding = 0;

    let familyTotalPaidThisTerm = 0;

    for (const studentId of context.studentIds) {
      // 1. Resolve real student name
      const student = await this.prisma.student.findUnique({
        where: { id: studentId, tenantId: context.tenantId },
        include: { membership: { include: { profile: true } } }
      });
      const firstName = student?.membership?.profile?.firstName || 'Student';

      // 2. Fetch canonical balance explanation
      const { lines, totalOutstandingKobo } = await this.reportingService.explainStudentBalance({
        tenantId: context.tenantId,
        studentId,
      });

      const outstanding = totalOutstandingKobo / 100;
      familyTotalOutstanding += outstanding;

      // 3. Calculate total paid this term/session
      const activeInvoices = await this.prisma.invoice.findMany({
        where: {
          tenantId: context.tenantId,
          studentId: studentId,
          term: context.activeAcademicSessionId ? { academicYearId: context.activeAcademicSessionId } : undefined,
          deletedAt: null
        },
        include: {
          payments: { where: { status: 'SUCCESS' } }
        }
      });
      
      let childTotalPaid = 0;
      for (const invoice of activeInvoices) {
        for (const payment of invoice.payments) {
          childTotalPaid += Number(payment.amount);
        }
      }
      familyTotalPaidThisTerm += childTotalPaid;

      children.push({
        studentId,
        firstName,
        totalOutstanding: outstanding,
        explanations: lines
          .filter((l) => l.amountKobo !== 0)
          .map((l) => `${l.label}: ₦${(l.amountKobo / 100).toLocaleString('en-NG')}`),
        classification: 'STANDARD',
      } as ChildFinanceSummary);
    }

    return {
      totalOutstanding: familyTotalOutstanding,
      totalPaidThisTerm: familyTotalPaidThisTerm,
      currency: 'NGN',
      children,
      upcomingInstallments: [],
      classification: 'STANDARD',
    } as any;
  }
}
