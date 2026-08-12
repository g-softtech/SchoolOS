import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@saas/core-platform';
import { BaseRepository } from '../../shared/repositories/base.repository';

@Injectable()
export class WebsiteRepository extends BaseRepository<
  Prisma.WebsiteDelegate<any>,
  Prisma.WebsiteCreateArgs,
  Prisma.WebsiteUpdateArgs
> {
  constructor(protected readonly prisma: PrismaClient) {
    super(prisma.website);
  }

  // Support for transactions
  async transaction<T>(action: (repo: WebsiteRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const repo = new WebsiteRepository(tx as PrismaClient);
      return action(repo);
    });
  }

  async findByTenant(tenantId: string) {
    return this.findFirst({ where: { tenantId, deletedAt: null } });
  }

  async findByDomain(domain: string) {
    return this.findFirst({ 
      where: { 
        domains: { some: { domainName: domain, deletedAt: null } },
        deletedAt: null
      },
      include: { domains: true }
    });
  }
}
