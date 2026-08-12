import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';

@Injectable()
export class PageRepository extends BaseRepository<
  Prisma.PageDelegate<any>,
  Prisma.PageCreateArgs,
  Prisma.PageUpdateArgs
> {
  constructor(protected readonly prisma: PrismaClient) {
    super(prisma.page);
  }

  async transaction<T>(action: (repo: PageRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const repo = new PageRepository(tx as PrismaClient);
      return action(repo);
    });
  }

  async findBySlug(tenantId: string, slug: string) {
    return this.findFirst({ where: { tenantId, slug, deletedAt: null } });
  }

  // Implementing Optimistic Locking wrapper
  async updateWithLock(id: string, tenantId: string, currentVersion: number, data: any) {
    const result = await this.prisma.page.updateMany({
      where: { id, tenantId, version: currentVersion },
      data: {
        ...data,
        version: { increment: 1 }
      }
    });

    if (result.count === 0) {
      throw new Error('OptimisticLockException: Page was modified by another transaction');
    }
    return this.findById(id, tenantId);
  }
}
