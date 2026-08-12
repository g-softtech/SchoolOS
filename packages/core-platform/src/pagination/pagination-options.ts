export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}
