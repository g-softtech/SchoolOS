import { IdentityProvisioningService, ProvisionMemberDto } from '../services/identity-provisioning.service';
import { PrismaService } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';

describe('IdentityProvisioningService', () => {
  const mockPrisma = mockDeep<PrismaService>();
  let service: IdentityProvisioningService;

  beforeEach(() => {
    mockReset(mockPrisma);
    service = new IdentityProvisioningService(mockPrisma);
  });

  describe('provisionWorkspaceMember', () => {
    const dto: ProvisionMemberDto = {
      tenantId: 'tenant-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@test.com',
      roleName: 'STUDENT',
      dateOfBirth: new Date('2010-01-01')
    };

    it('should return early if membership already exists (idempotency)', async () => {
      const existingMembership = { id: 'mem-1', tenantId: 'tenant-1' };
      const existingUser: any = {
        id: 'user-1',
        email: 'alice@test.com',
        memberships: [existingMembership]
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.provisionWorkspaceMember(dto);

      expect(result).toBe(existingMembership);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should provision user, role, profile, and membership within a transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const mockTx = {
        role: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'role-1' })
        },
        user: {
          create: jest.fn().mockResolvedValue({ id: 'user-1' })
        },
        tenantMembership: {
          create: jest.fn().mockResolvedValue({ id: 'mem-1' })
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      const result = await service.provisionWorkspaceMember(dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      
      // Verifying operations inside the transaction
      expect(mockTx.role.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', name: 'STUDENT' }
      });
      expect(mockTx.role.create).toHaveBeenCalledWith({
        data: { tenantId: 'tenant-1', name: 'STUDENT' }
      });
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: { email: 'alice@test.com', globalRole: 'USER' }
      });
      expect(mockTx.tenantMembership.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          roleId: 'role-1',
          state: 'ACTIVE',
          profile: {
            create: {
              firstName: 'Alice',
              lastName: 'Smith',
              dob: dto.dateOfBirth
            }
          }
        }
      });

      expect(result).toEqual({ id: 'mem-1' });
    });

    it('should reuse existing role and existing user (without memberships in this tenant) inside transaction', async () => {
      const existingUser: any = {
        id: 'user-existing',
        email: 'alice@test.com',
        memberships: [] // No membership in this tenant
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const mockTx = {
        role: {
          findFirst: jest.fn().mockResolvedValue({ id: 'role-existing' }),
          create: jest.fn()
        },
        user: {
          create: jest.fn()
        },
        tenantMembership: {
          create: jest.fn().mockResolvedValue({ id: 'mem-2' })
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      const result = await service.provisionWorkspaceMember(dto);

      expect(mockTx.role.create).not.toHaveBeenCalled(); // Role exists
      expect(mockTx.user.create).not.toHaveBeenCalled(); // User exists

      expect(mockTx.tenantMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-existing',
          roleId: 'role-existing'
        })
      });

      expect(result).toEqual({ id: 'mem-2' });
    });
  });
});
