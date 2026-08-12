import { Module } from '@nestjs/common';
import { WebsiteController } from './controllers/website.controller';
import { PageController } from './controllers/page.controller';
import { NavigationController } from './controllers/navigation.controller';
import { AssetController } from './controllers/asset.controller';
import { EdgeDeliveryController } from './controllers/edge-delivery.controller';
import { WebsiteService } from './services/website.service';
import { PageService } from './services/page.service';
import { NavigationService } from './services/navigation.service';
import { AssetService } from './services/asset.service';
import { WebsiteRepository } from './repositories/website.repository';
import { PageRepository } from './repositories/page.repository';
import { NavigationRepository } from './repositories/navigation.repository';
import { AssetRepository } from './repositories/asset.repository';
import { WebsiteCacheSubscriber } from './subscribers/website-cache.subscriber';
import { CorePlatformModule } from '@saas/core-platform';

@Module({
  imports: [CorePlatformModule],
  controllers: [
    WebsiteController,
    PageController,
    NavigationController,
    AssetController,
    EdgeDeliveryController,
  ],
  providers: [
    WebsiteService,
    PageService,
    NavigationService,
    AssetService,
    WebsiteRepository,
    PageRepository,
    NavigationRepository,
    AssetRepository,
    WebsiteCacheSubscriber,
  ],
  exports: [WebsiteService, PageService],
})
export class WebsiteModule {}
