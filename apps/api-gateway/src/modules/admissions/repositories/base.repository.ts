import { Injectable } from '@nestjs/common';

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

@Injectable()
export abstract class BaseRepository<T, CreateDto, UpdateDto, Specification> {
  abstract create(data: CreateDto): Promise<T>;
  abstract findById(id: string, tenantId: string): Promise<T | null>;
  abstract search(tenantId: string, spec: Specification, pagination?: PaginationOptions): Promise<PaginatedResult<T>>;
  abstract findManyIncludingDeleted(tenantId: string, spec: Specification): Promise<T[]>;
  abstract update(id: string, tenantId: string, data: UpdateDto): Promise<T>;
  abstract softDelete(id: string, tenantId: string, deletedBy: string): Promise<T>;
  abstract restore(id: string, tenantId: string): Promise<T>;
  abstract exists(id: string, tenantId: string): Promise<boolean>;
  abstract count(tenantId: string, spec?: Specification): Promise<number>;
  abstract transaction<R>(action: (repo: any) => Promise<R>): Promise<R>;
}
