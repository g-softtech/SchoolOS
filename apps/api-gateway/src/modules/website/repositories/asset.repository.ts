import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';

@Injectable()
export class AssetRepository extends BaseRepository<
  Prisma.AssetDelegate<any>,
  Prisma.AssetCreateArgs,
  Prisma.AssetUpdateArgs
> {
  constructor(protected readonly prisma: PrismaClient) {
    super(prisma.asset);
  }

  async findActiveAssets(tenantId: string, mimeType?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (mimeType) {
      where.mimeType = { startsWith: mimeType }; // e.g. "image/"
    }
    return this.findMany({ where, orderBy: { id: 'desc' } });
  }
}
