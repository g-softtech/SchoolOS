import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';

@Injectable()
export class NavigationRepository extends BaseRepository<
  Prisma.NavigationMenuDelegate<any>,
  Prisma.NavigationMenuCreateArgs,
  Prisma.NavigationMenuUpdateArgs
> {
  constructor(public readonly prisma: PrismaClient) {
    super(prisma, prisma.navigationMenu);
  }

  async transaction<T>(action: (repo: NavigationRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const repo = new NavigationRepository(tx as PrismaClient);
      return action(repo);
    });
  }

  async findByLocation(tenantId: string, location: string, locale: string = 'en') {
    return this.findFirst({
      where: { tenantId, location, locale },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { children: { orderBy: { sortOrder: 'asc' } } }
        }
      }
    });
  }
}
