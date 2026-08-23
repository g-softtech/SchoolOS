import { Module } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { IdCardsController } from './controllers/id-cards.controller';
import { DocumentService, IdCardService } from '@saas/core-platform';
import { StorageModule } from '../../platform-services/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DocumentsController, IdCardsController],
  providers: [DocumentService, IdCardService],
  exports: [DocumentService, IdCardService],
})
export class DocumentsModule {}
