import { BaseRepository, PaginationOptions, PaginatedResult } from '../repositories/base.repository';
import { PrismaClient, Role } from '@saas/core-platform';

export class RoleRepository implements BaseRepository<Role, any, any, any> {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any): Promise<Role> {
    throw new Error('Method not implemented.');
  }

  async findById(id: string, tenantId: string): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: { id, tenantId },
      include: { permissions: { include: { permission: true } } }
    });
  }

  async search(tenantId: string, spec: any, pagination?: PaginationOptions): Promise<PaginatedResult<Role>> {
    throw new Error('Method not implemented.');
  }

  async findManyIncludingDeleted(tenantId: string, spec: any): Promise<Role[]> {
    throw new Error('Method not implemented.');
  }

  async update(id: string, tenantId: string, data: any): Promise<Role> {
    throw new Error('Method not implemented.');
  }

  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<Role> {
    throw new Error('Method not implemented.');
  }

  async restore(id: string, tenantId: string): Promise<Role> {
    throw new Error('Method not implemented.');
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async count(tenantId: string, spec?: any): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async transaction<R>(action: (repo: RoleRepository) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (tx) => {
      return action(new RoleRepository(tx as PrismaClient));
    });
  }
}
