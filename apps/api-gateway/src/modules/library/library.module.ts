import { Module } from '@nestjs/common';
import { BooksController } from './controllers/books.controller';
import { CirculationController } from './controllers/circulation.controller';
import { BookService, CirculationService, FineService, InvoiceService, FinancialLedgerService } from '@saas/core-platform';

@Module({
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
