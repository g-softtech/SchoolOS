import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { FinanceFacade } from '../facades/FinanceFacade';
import { FamilyContextGuard } from '../auth/FamilyContext.guard';
import { GetFamilyContext } from '../auth/FamilyContext.decorator';
import { FamilyContext } from '../auth/FamilyContext';

@Controller('api/parent/finance')
@UseGuards(FamilyContextGuard)
export class ParentFinanceController {
  constructor(private readonly financeFacade: FinanceFacade) {}

  @Version('1')
  @Get('summary')
  async getFinanceSummary(@GetFamilyContext() context: FamilyContext) {
    return await this.financeFacade.getFamilyFinanceSummary(context, 'req-fin');
  }
}
