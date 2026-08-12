import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class BaseRepository<Delegate, CreateArgs, UpdateArgs> {
  constructor(protected readonly delegate: any) {}

  async create(args: CreateArgs): Promise<any> {
    return this.delegate.create(args);
  }

  async findFirst(args: any): Promise<any> {
    return this.delegate.findFirst(args);
  }

  async findMany(args: any): Promise<any[]> {
    return this.delegate.findMany(args);
  }

  async findById(id: string, tenantId: string): Promise<any> {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async update(id: string, tenantId: string, data: any): Promise<any> {
    return this.delegate.update({
      where: { id },
      data,
    });
  }
}
