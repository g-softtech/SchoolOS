import { Module } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { IdCardsController } from './controllers/id-cards.controller';
import { DocumentService, IdCardService } from '@saas/core-platform';
import { StorageModule } from '../../platform-services/storage/storage.module';
import { CorePlatformModule } from '@saas/core-platform';

@Module({
  imports: [StorageModule, CorePlatformModule],
  controllers: [DocumentsController, IdCardsController],
  providers: [DocumentService, IdCardService],
  exports: [DocumentService, IdCardService],
})
export class DocumentsModule {}
