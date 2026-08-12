import { Injectable } from '@nestjs/common';
import { AssetRepository } from '../repositories/asset.repository';
import { PlatformStorageService, PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class AssetService {
  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly storage: PlatformStorageService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async uploadAsset(tenantId: string, file: any) {
    // 1. Validate quota
    // 2. Upload via storage abstraction
    const storageKey = `tenants/${tenantId}/website/assets/${Date.now()}-${file.originalname}`;
    const uploadResult = await this.storage.upload(storageKey, file.buffer, file.mimetype);

    // 3. Save to repository
    const asset = await this.assetRepo.create({
      data: {
        tenantId,
        websiteId: 'default',
        url: uploadResult.url || '',
        mimeType: file.mimetype,
        size: file.size,
      }
    });

    // 4. Emit event for background optimization (WebP, Blurhash)
    await this.eventBus.publish({
      eventName: 'Website.AssetUploaded',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { tenantId, assetId: asset.id, storageKey }
    });

    return asset;
  }
}
