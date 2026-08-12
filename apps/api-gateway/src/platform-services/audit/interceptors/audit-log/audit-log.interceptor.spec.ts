import { AuditLogInterceptor } from './audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  it('should be defined', () => {
    expect(new AuditLogInterceptor(null as any, null as any)).toBeDefined();
  });
});
