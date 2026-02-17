interface ApiMeta {
  requestId: string;
  timestamp: number;
  latencyMs: number;
  version: string;
}

interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, string> } | null;
  meta: ApiMeta;
  pagination: PaginationMeta | null;
}

export class ApiResponseEnvelope {
  private version = '1.0.0';

  success<T>(data: T, startTime: number, pagination?: PaginationMeta): ApiResponse<T> {
    return {
      success: true, data, error: null,
      meta: { requestId: crypto.randomUUID(), timestamp: Date.now(), latencyMs: Date.now() - startTime, version: this.version },
      pagination: pagination ?? null,
    };
  }

  error(code: string, message: string, startTime: number, details?: Record<string, string>): ApiResponse<null> {
    return {
      success: false, data: null,
      error: { code, message, details },
      meta: { requestId: crypto.randomUUID(), timestamp: Date.now(), latencyMs: Date.now() - startTime, version: this.version },
      pagination: null,
    };
  }

  paginate(page: number, perPage: number, total: number): PaginationMeta {
    const totalPages = Math.ceil(total / perPage);
    return { page, perPage, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }
}