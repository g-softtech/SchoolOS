import { BaseRepository, PaginationOptions, PaginatedResult } from '../repositories/base.repository';
import { PrismaClient, Session } from '@saas/core-platform';

export class SessionRepository implements BaseRepository<Session, any, any, any> {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { sessionToken: token } });
  }

  async findById(id: string): Promise<Session | null> {
    throw new Error('Method not implemented.');
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  async search(tenantId: string, spec: any, pagination?: PaginationOptions): Promise<PaginatedResult<Session>> {
    throw new Error('Method not implemented.');
  }

  async findManyIncludingDeleted(tenantId: string, spec: any): Promise<Session[]> {
    throw new Error('Method not implemented.');
  }

  async update(id: string, tenantId: string, data: any): Promise<Session> {
    throw new Error('Method not implemented.');
  }

  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<Session> {
    throw new Error('Method not implemented.');
  }

  async restore(id: string, tenantId: string): Promise<Session> {
    throw new Error('Method not implemented.');
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async count(tenantId: string, spec?: any): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async transaction<R>(action: (repo: SessionRepository) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (tx) => {
      return action(new SessionRepository(tx as PrismaClient));
    });
  }
}
