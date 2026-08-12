import { Module } from '@nestjs/common';
import { FinancialLedgerService } from './services/financial-ledger.service';
import { FeeEngineService } from './services/fee-engine.service';
import { PaymentProcessingService } from './services/payment-processing.service';
import { InstallmentEngineService } from './services/installment-engine.service';
import { CorePlatformModule } from '@saas/core-platform';

@Module({
  imports: [CorePlatformModule],
  providers: [
    FinancialLedgerService,
    FeeEngineService,
    PaymentProcessingService,
    InstallmentEngineService,
  ],
  exports: [
    FinancialLedgerService,
    FeeEngineService,
    PaymentProcessingService,
    InstallmentEngineService,
  ],
})
export class FinanceModule {}
