import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '@saas/core-platform';
import { AuditMaskingService } from '@saas/core-platform';
import { AuditRetentionPolicy } from '@saas/core-platform';
import { randomUUID } from 'crypto';

describe('Level 6: Audit & Compliance', () => {
  let auditService: AuditService;
  
  const mockPrismaClient = {
    auditLog: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({
        id: randomUUID(),
        ...args.data
      }))
    }
  } as any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AuditMaskingService,
        AuditRetentionPolicy,
        AuditService
      ],
    }).compile();

    auditService = moduleFixture.get<AuditService>(AuditService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Immutable Audit Records', () => {
    it('appends records but provides no update or delete operations on the service', () => {
      // Demonstrated structurally by AuditService only having logAction
      expect(auditService['updateAction' as keyof AuditService]).toBeUndefined();
      expect(auditService['deleteAction' as keyof AuditService]).toBeUndefined();
    });

    it('successfully persists an audit event through the Prisma transaction client', async () => {
      const result = await auditService.logAction(mockPrismaClient, {
        severity: 'MEDIUM',
        action: 'POLICY_CREATED',
        entity: 'Policy',
        entityId: 'pol-1',
        tenantId: 'tenant-1'
      });
      expect(result).toBeDefined();
      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Correlation Consistency', () => {
    it('auto-generates a correlationId if missing', async () => {
      const result = await auditService.logAction(mockPrismaClient, {
        severity: 'LOW',
        action: 'LOGIN',
        entity: 'Session',
        entityId: 'ses-1'
      });
      expect(result.correlationId).toBeDefined();
    });

    it('preserves an explicitly provided correlationId for distributed tracing', async () => {
      const correlationId = 'trace-12345';
      const result = await auditService.logAction(mockPrismaClient, {
        severity: 'LOW',
        action: 'LOGIN',
        entity: 'Session',
        entityId: 'ses-1',
        correlationId
      });
      expect(result.correlationId).toBe(correlationId);
    });
  });

  describe('3. Event Serialization and Masking', () => {
    it('masks sensitive keys recursively in metadata', async () => {
      const metadata = {
        username: 'admin',
        password: 'supersecretpassword',
        nested: {
          token: 'jwt-123',
          safeField: 'visible'
        }
      };
      
      const result = await auditService.logAction(mockPrismaClient, {
        severity: 'HIGH',
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: 'usr-1',
        metadata
      });

      expect(result.metadata.password).toBe('***REDACTED***');
      expect(result.metadata.nested.token).toBe('***REDACTED***');
      expect(result.metadata.nested.safeField).toBe('visible');
      expect(result.metadata.username).toBe('admin');
    });
  });

  describe('4. Retention Bounds', () => {
    it('sets retention date to +1 year for LOW severity', async () => {
      const now = new Date();
      const result = await auditService.logAction(mockPrismaClient, {
        severity: 'LOW',
        action: 'LOGIN',
        entity: 'Session',
        entityId: 'ses-1'
      });
      const diffYears = result.retentionDate.getFullYear() - now.getFullYear();
      expect(diffYears).toBe(1);
    });

    it('sets retention date to +7 years for CRITICAL severity', async () => {
      const now = new Date();
      const result = await auditService.logAction(mockPrismaClient, {
        severity: 'CRITICAL',
        action: 'DATA_EXPORT',
        entity: 'Tenant',
        entityId: 'ten-1'
      });
      const diffYears = result.retentionDate.getFullYear() - now.getFullYear();
      expect(diffYears).toBe(7);
    });
  });

  describe('5. Cross-Tenant Isolation (Logical Guarantee)', () => {
    it('binds audit records to the exact provided tenant boundary', async () => {
      const result = await auditService.logAction(mockPrismaClient, {
        severity: 'MEDIUM',
        action: 'RESOURCE_ACCESSED',
        entity: 'File',
        entityId: 'file-1',
        tenantId: 'tenant-a'
      });
      expect(result.tenantId).toBe('tenant-a');
      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-a' })
      }));
    });
  });
});
