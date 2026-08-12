import { ApiResponse } from '../responses/api-response';

export interface ApiClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  getToken?: () => Promise<string | null>;
}

export class CoreApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  private async fetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    const headers = new Headers(this.options.defaultHeaders);
    
    if (this.options.getToken) {
      const token = await this.options.getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && init?.method !== 'GET') {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const json = await response.json();
    return json as ApiResponse<T>;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.fetch<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.fetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  async put<T>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.fetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.fetch<T>(path, { method: 'DELETE' });
  }
}
