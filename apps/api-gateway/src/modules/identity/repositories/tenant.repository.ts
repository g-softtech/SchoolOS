import { BaseRepository, PaginationOptions, PaginatedResult } from './base.repository';
import { PrismaClient, Tenant } from '@saas/core-platform';

export interface TenantSpecification {
  status?: string;
}

export class TenantRepository implements BaseRepository<Tenant, any, any, TenantSpecification> {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any): Promise<Tenant> {
    return this.prisma.tenant.create({ data });
  }

  async findById(id: string, tenantId: string): Promise<Tenant | null> {
    // tenantId passed in usually matches id in this context
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async search(tenantId: string, spec: TenantSpecification, pagination?: PaginationOptions): Promise<PaginatedResult<Tenant>> {
    throw new Error('Method not implemented.');
  }

  async findManyIncludingDeleted(tenantId: string, spec: TenantSpecification): Promise<Tenant[]> {
    throw new Error('Method not implemented.');
  }

  async update(id: string, tenantId: string, data: any): Promise<Tenant> {
    // Enforce optimistic locking if version is provided
    if (data.version !== undefined) {
      const current = await this.findById(id, tenantId);
      if (current && (current as any).version !== data.version) {
         throw new Error("Optimistic locking failure on Tenant");
      }
      data.version = data.version + 1;
    }
    
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<Tenant> {
    throw new Error('Method not implemented.');
  }

  async restore(id: string, tenantId: string): Promise<Tenant> {
    throw new Error('Method not implemented.');
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({ where: { id: tenantId } });
    return count > 0;
  }

  async count(tenantId: string, spec?: TenantSpecification): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async transaction<R>(action: (repo: TenantRepository) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (tx) => {
      const txRepo = new TenantRepository(tx as PrismaClient);
      return action(txRepo);
    });
  }
}
