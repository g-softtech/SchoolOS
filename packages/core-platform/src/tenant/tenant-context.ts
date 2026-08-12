import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId?: string | null;
  roleId?: string | null;
}

export class WorkspaceContext {
  tenantId: string;
  userId?: string | null;
  membershipId?: string | null;
  roleId?: string | null;
}

// Pure execution context storage. No framework coupling.
export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();
