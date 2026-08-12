// Tenant Helper
export class TenantHelper {
  static getTenantHeader(tenantId: string) {
    return { 'x-tenant-id': tenantId };
  }
}
