import { Test, TestingModule } from '@nestjs/testing';
import { CredentialService } from './credential.service';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CredentialService', () => {
  let service: CredentialService;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEmployee = { id: 'emp-1', tenantId: 't1' };
  const mockCredential = {
    id: 'cred-1',
    tenantId: 't1',
    employeeId: 'emp-1',
    type: 'QR',
    token: 'abc123',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        {
          provide: PrismaService,
          useValue: {
            employee: { findFirst: jest.fn() },
            identityCredential: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(CredentialService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  describe('issueCredential', () => {
    it('creates a new credential and emits Staff.Credential.Issued', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockEmployee);
      (prisma.identityCredential.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.identityCredential.create as jest.Mock).mockResolvedValue(mockCredential);

      await service.issueCredential('t1', 'emp-1', 'QR');

      expect(eventEmitter.emit).toHaveBeenCalledWith('Staff.Credential.Issued', expect.objectContaining({
        tenantId: 't1',
        employeeId: 'emp-1',
        type: 'QR',
      }));
    });

    it('auto-revokes the existing active credential before issuing a new one', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockEmployee);
      (prisma.identityCredential.findFirst as jest.Mock).mockResolvedValue(mockCredential);
      (prisma.identityCredential.update as jest.Mock).mockResolvedValue({ ...mockCredential, status: 'REVOKED' });
      (prisma.identityCredential.create as jest.Mock).mockResolvedValue({ ...mockCredential, id: 'cred-2', token: 'newtoken' });

      await service.issueCredential('t1', 'emp-1', 'QR');

      expect(prisma.identityCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-1' },
        data: { status: 'REVOKED' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('Staff.Credential.Revoked', expect.objectContaining({
        credentialId: 'cred-1',
      }));
    });

    it('throws NotFoundException if employee does not exist', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.issueCredential('t1', 'ghost', 'QR')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeCredential', () => {
    it('revokes a credential and emits Staff.Credential.Revoked', async () => {
      (prisma.identityCredential.findFirst as jest.Mock).mockResolvedValue(mockCredential);
      (prisma.identityCredential.update as jest.Mock).mockResolvedValue({ ...mockCredential, status: 'REVOKED' });

      await service.revokeCredential('t1', 'cred-1', 'Lost card');

      expect(eventEmitter.emit).toHaveBeenCalledWith('Staff.Credential.Revoked', expect.objectContaining({
        credentialId: 'cred-1',
        reason: 'Lost card',
      }));
    });

    it('throws ConflictException if credential is already revoked', async () => {
      (prisma.identityCredential.findFirst as jest.Mock).mockResolvedValue({ ...mockCredential, status: 'REVOKED' });
      await expect(service.revokeCredential('t1', 'cred-1', 'test')).rejects.toThrow(ConflictException);
    });
  });

  describe('validateToken', () => {
    it('returns the employeeId for a valid active token', async () => {
      (prisma.identityCredential.findFirst as jest.Mock).mockResolvedValue({ employeeId: 'emp-1' });
      const result = await service.validateToken('abc123');
      expect(result).toBe('emp-1');
    });

    it('returns null for an invalid or revoked token', async () => {
      (prisma.identityCredential.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await service.validateToken('badtoken');
      expect(result).toBeNull();
    });
  });
});
