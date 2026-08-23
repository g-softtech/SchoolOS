import { Injectable } from '@nestjs/common';
import { FinancialReportingReadService } from '@saas/core-platform';
import { FamilyContext } from '../auth/FamilyContext';
import { FamilyFinanceSummaryView, ChildFinanceSummary } from '../dto/ViewModels';

@Injectable()
export class FinanceFacade {
  constructor(
    private readonly reportingService: FinancialReportingReadService
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

    for (const studentId of context.studentIds) {
      const { lines, totalOutstandingKobo } = await this.reportingService.explainStudentBalance({
        tenantId: context.tenantId,
        studentId,
      });

      const outstanding = totalOutstandingKobo / 100;
      familyTotalOutstanding += outstanding;

      children.push({
        studentId,
        firstName: 'Child', // Would be joined from Student profile
        totalOutstanding: outstanding,
        explanations: lines
          .filter((l) => l.amountKobo !== 0)
          .map((l) => `${l.label}: ₦${(l.amountKobo / 100).toLocaleString('en-NG')}`),
        classification: 'STANDARD',
      } as ChildFinanceSummary);
    }

    return {
      totalOutstanding: familyTotalOutstanding,
      totalPaidThisTerm: 0, // Placeholder — would require period-scoped payment query
      currency: 'NGN',
      children,
      upcomingInstallments: [],
      classification: 'STANDARD',
    } as any;
  }
}
