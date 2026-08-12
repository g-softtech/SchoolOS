import { Injectable } from '@nestjs/common';
import { FinancialReportingReadService } from '../../../../packages/core-platform/src/domain/finance/services/FinancialReportingReadService';
import { FamilyContext } from '../auth/FamilyContext';
import { FamilyFinanceSummaryView, ChildFinanceSummary } from '../dto/ViewModels';

@Injectable()
export class FinanceFacade {
  constructor(
    private readonly reportingService: FinancialReportingReadService
  ) {}

  /**
   * Adapts the raw internal Finance reporting services into the Parent-Friendly ViewModel.
   * Enforces the "Parent Experience Principle" by strictly returning Explainability Strings
   * rather than raw math.
   */
  async getFamilyFinanceSummary(context: FamilyContext, correlationId: string): Promise<Omit<FamilyFinanceSummaryView, 'sourceStatus' | 'correlationId' | 'generatedAt'>> {
    const children: ChildFinanceSummary[] = [];
    let familyTotalOutstanding = 0;

    for (const studentId of context.studentIds) {
      // Internal domain call
      const statement = await this.reportingService.generateStudentStatement(context.tenantId, studentId);
      
      // Get the zero-math explainability string
      const explainString = await this.reportingService.explainBalanceComplete(context.tenantId, studentId);
      
      const outstanding = Number(statement.outstandingBalance);
      familyTotalOutstanding += outstanding;

      children.push({
        studentId,
        firstName: 'Child', // Would be joined from Student profile in reality
        totalOutstanding: outstanding,
        explanations: explainString.split('\n').filter(line => line.trim() !== '')
      });
    }

    return {
      totalOutstanding: familyTotalOutstanding,
      totalPaidThisTerm: 0, // Placeholder, would require a specific query against payments
      currency: 'NGN',
      children,
      upcomingInstallments: [], // Placeholder, would query InstallmentEngine
    };
  }
}
