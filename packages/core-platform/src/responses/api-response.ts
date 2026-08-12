export interface ResponseMeta {
  pagination?: {
    total: number;
    limit: number;
    offset?: number;
    nextCursor?: string;
  };
  version?: string;
  requestId?: string;
  executionTimeMs?: number;
  [key: string]: any;
}

export class ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta?: ResponseMeta;
  errors?: string[];

  constructor(success: boolean, data: T | null = null, meta?: ResponseMeta, errors?: string[]) {
    this.success = success;
    this.data = data;
    this.meta = meta;
    this.errors = errors || [];
  }

  static success<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
    return new ApiResponse<T>(true, data, meta);
  }

  static error<T>(errors: string[], meta?: ResponseMeta): ApiResponse<T> {
    return new ApiResponse<T>(false, null, meta, errors);
  }
}
