import { BaseRepository, PaginationOptions, PaginatedResult } from './base.repository';
import { PrismaClient, User } from '@saas/core-platform';

export interface UserSpecification {
  email?: string;
  globalRole?: string;
}

export class UserRepository implements BaseRepository<User, any, any, UserSpecification> {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string, tenantId: string): Promise<User | null> {
    // User is a global entity, tenantId is ignored for finding the user themselves
    // but the API signature demands it for BaseRepository.
    return this.prisma.user.findUnique({ where: { id, deletedAt: null } });
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email, deletedAt: null } });
  }

  async search(tenantId: string, spec: UserSpecification, pagination?: PaginationOptions): Promise<PaginatedResult<User>> {
    throw new Error('Method not implemented.');
  }

  async findManyIncludingDeleted(tenantId: string, spec: UserSpecification): Promise<User[]> {
    throw new Error('Method not implemented.');
  }

  async update(id: string, tenantId: string, data: any): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() } // deletedBy not on User model in schema currently, but we soft delete.
    });
  }

  async restore(id: string, tenantId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null }
    });
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id, deletedAt: null } });
    return count > 0;
  }

  async count(tenantId: string, spec?: UserSpecification): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async transaction<R>(action: (repo: UserRepository) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (tx) => {
      const txRepo = new UserRepository(tx as PrismaClient);
      return action(txRepo);
    });
  }
}
