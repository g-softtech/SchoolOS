import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
}

// Pure execution context storage. No framework coupling.
export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();
