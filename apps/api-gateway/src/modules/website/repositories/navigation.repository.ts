import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';

@Injectable()
export class NavigationRepository extends BaseRepository<
  Prisma.NavigationMenuDelegate<any>,
  Prisma.NavigationMenuCreateArgs,
  Prisma.NavigationMenuUpdateArgs
> {
  constructor(protected readonly prisma: PrismaClient) {
    super(prisma.navigationMenu);
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
