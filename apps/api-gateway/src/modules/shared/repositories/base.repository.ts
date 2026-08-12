import { Injectable } from '@nestjs/common';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

@Injectable()
export abstract class BaseRepository<
  T,
  CreateArgs = any,
  UpdateArgs = any,
  FindUniqueArgs = any,
  FindFirstArgs = any,
  FindManyArgs = any
> {
  constructor(
    public readonly prisma: any,
    public readonly model: any
  ) {}

  async create(args: CreateArgs): Promise<T> {
    return this.model.create(args);
  }

  async findFirst(args: FindFirstArgs): Promise<T | null> {
    return this.model.findFirst(args);
  }

  async findMany(args: FindManyArgs): Promise<T[]> {
    return this.model.findMany(args);
  }

  async findById(tenantId: string, id: string): Promise<T | null> {
    return this.model.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async update(id: string, tenantId: string, data: any): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async paginate(args: any, skip: number, take: number): Promise<PaginatedResult<T>> {
    const [data, total] = await this.prisma.$transaction([
      this.model.findMany({ ...args, skip, take }),
      this.model.count({ where: args.where })
    ]);
    return { data, total, skip, take };
  }
}
