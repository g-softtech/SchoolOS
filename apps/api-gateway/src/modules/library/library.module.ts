import { Module } from '@nestjs/common';
import { BooksController } from './controllers/books.controller';
import { CirculationController } from './controllers/circulation.controller';
import { BookService, CirculationService, FineService, InvoiceService, FinancialLedgerService, CorePlatformModule } from '@saas/core-platform';

@Module({
  imports: [CorePlatformModule],
  controllers: [BooksController, CirculationController],
  providers: [
    BookService,
    CirculationService,
    FineService,
    InvoiceService,
    FinancialLedgerService
  ],
})
export class LibraryModule {}
