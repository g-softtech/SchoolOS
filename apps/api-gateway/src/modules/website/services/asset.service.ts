import { Injectable } from '@nestjs/common';
import { AssetRepository } from '../repositories/asset.repository';
import { PlatformStorageService, OutboxService } from '@saas/core-platform';

@Injectable()
export class AssetService {
  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly storage: PlatformStorageService,
    private readonly outboxService: OutboxService
  ) {}

  async uploadAsset(tenantId: string, file: any) {
    // 1. Validate quota
    // 2. Upload via storage abstraction
    const storageKey = `tenants/${tenantId}/website/assets/${Date.now()}-${file.originalname}`;
    const uploadResult = await this.storage.upload(storageKey, file.buffer, file.mimetype);

    // 3. Save to repository and emit event atomically
    return this.assetRepo.transaction(async (repo) => {
      const asset = await repo.create({
        data: {
          tenantId,
          websiteId: 'default', // Legacy unused field
          url: uploadResult.url || '',
          mimeType: file.mimetype,
          size: file.size,
        }
      });

      // 4. Emit event for background optimization (WebP, Blurhash)
      await this.outboxService.appendEvent(repo.prisma, {
        eventType: 'Website.AssetUploaded',
        aggregateId: asset.id,
        aggregateType: 'Asset',
        tenantId,
        version: 1,
        payload: { tenantId, assetId: asset.id, storageKey }
      });

      return asset;
    });
  }
}
