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

export interface BaseRepository<T, CreateDto, UpdateDto, Specification> {
  create(data: CreateDto): Promise<T>;
  findById(id: string, tenantId: string): Promise<T | null>;
  search(tenantId: string, spec: Specification, pagination?: PaginationOptions): Promise<PaginatedResult<T>>;
  findManyIncludingDeleted(tenantId: string, spec: Specification): Promise<T[]>;
  update(id: string, tenantId: string, data: UpdateDto): Promise<T>;
  softDelete(id: string, tenantId: string, deletedBy: string): Promise<T>;
  restore(id: string, tenantId: string): Promise<T>;
  exists(id: string, tenantId: string): Promise<boolean>;
  count(tenantId: string, spec?: Specification): Promise<number>;
  transaction<R>(action: (repo: any) => Promise<R>): Promise<R>;
}

