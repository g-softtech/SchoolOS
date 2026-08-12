import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';

@Injectable()
export class AssetRepository extends BaseRepository<
  Prisma.AssetDelegate<any>,
  Prisma.AssetCreateArgs,
  Prisma.AssetUpdateArgs
> {
  constructor(public readonly prisma: PrismaClient) {
    super(prisma, prisma.asset);
  }

  async transaction<T>(action: (repo: AssetRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const repo = new AssetRepository(tx as PrismaClient);
      return action(repo);
    });
  }

  async findActiveAssets(tenantId: string, mimeType?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (mimeType) {
      where.mimeType = { startsWith: mimeType }; // e.g. "image/"
    }
    return this.findMany({ where, orderBy: { id: 'desc' } });
  }
}
