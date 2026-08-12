import { BaseRepository, PaginationOptions, PaginatedResult } from './base.repository';
import { PrismaClient, TenantMembership } from '@saas/core-platform';

export interface TenantMembershipSpecification {
  userId?: string;
  roleId?: string;
}

export class TenantMembershipRepository implements BaseRepository<TenantMembership, any, any, TenantMembershipSpecification> {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any): Promise<TenantMembership> {
    return this.prisma.tenantMembership.create({ data });
  }

  async findById(id: string, tenantId: string): Promise<TenantMembership | null> {
    return this.prisma.tenantMembership.findFirst({ 
      where: { id, tenantId, revokedAt: null }
    });
  }
  
  async findByUserId(userId: string, tenantId: string): Promise<TenantMembership | null> {
    return this.prisma.tenantMembership.findUnique({ 
      where: { 
        tenantId_userId: { tenantId, userId }
      }
    });
  }

  async search(tenantId: string, spec: TenantMembershipSpecification, pagination?: PaginationOptions): Promise<PaginatedResult<TenantMembership>> {
    throw new Error('Method not implemented.');
  }

  async findManyIncludingDeleted(tenantId: string, spec: TenantMembershipSpecification): Promise<TenantMembership[]> {
    throw new Error('Method not implemented.');
  }

  async update(id: string, tenantId: string, data: any): Promise<TenantMembership> {
    // Optimistic locking
    if (data.version !== undefined) {
      const current = await this.findById(id, tenantId);
      if (current && current.version !== data.version) {
         throw new Error("Optimistic locking failure on TenantMembership");
      }
      data.version = data.version + 1;
    }

    return this.prisma.tenantMembership.update({
      where: { id, tenantId },
      data,
    });
  }

  async softDelete(id: string, tenantId: string, revokedBy: string): Promise<TenantMembership> {
    const membership = await this.findById(id, tenantId);
    if (!membership) throw new Error('Not found');

    return this.prisma.tenantMembership.update({
      where: { id, tenantId },
      data: { 
        revokedAt: new Date(),
        revokedBy,
        version: membership.version + 1
      }
    });
  }

  async restore(id: string, tenantId: string): Promise<TenantMembership> {
    const membership = await this.findById(id, tenantId);
    if (!membership) throw new Error('Not found');

    return this.prisma.tenantMembership.update({
      where: { id, tenantId },
      data: { 
        revokedAt: null,
        revokedBy: null,
        version: membership.version + 1
      }
    });
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.tenantMembership.count({ 
      where: { id, tenantId, revokedAt: null } 
    });
    return count > 0;
  }

  async count(tenantId: string, spec?: TenantMembershipSpecification): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async transaction<R>(action: (repo: TenantMembershipRepository) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (tx) => {
      const txRepo = new TenantMembershipRepository(tx as PrismaClient);
      return action(txRepo);
    });
  }
}
