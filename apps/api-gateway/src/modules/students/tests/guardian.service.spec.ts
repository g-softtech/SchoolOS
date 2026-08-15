import { GuardianService } from '../services/guardian.service';
import { GuardianRepository } from '../repositories/guardian.repository';
import { PrismaService, PlatformEventBus } from '@saas/core-platform';
import { IdentityProvisioningService } from '../../identity/services/identity-provisioning.service';
import { GuardianRelationshipType } from '../dto/student.types';
import { NotFoundException } from '@nestjs/common';
import { mockDeep, mockReset } from 'jest-mock-extended';

describe('GuardianService — linkGuardian tenant isolation', () => {
  const mockGuardianRepo = mockDeep<GuardianRepository>();
  const mockPrisma = mockDeep<PrismaService>();
  const mockEventBus = mockDeep<PlatformEventBus>();
  const mockIdentityService = mockDeep<IdentityProvisioningService>();

  let service: GuardianService;

  beforeEach(() => {
    mockReset(mockGuardianRepo);
    mockReset(mockPrisma);
    mockReset(mockEventBus);
    mockReset(mockIdentityService);

    service = new GuardianService(
      mockGuardianRepo,
      mockPrisma as any,
      mockEventBus,
      mockIdentityService
    );
  });

  describe('linkGuardian', () => {
    const tenantId = 'tenant-alpha';
    const studentId = 'stu-1';
    const guardianId = 'guardian-1';
    const relationship = GuardianRelationshipType.FATHER;

    it('should reject linking when student does not exist', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.linkGuardian(tenantId, studentId, guardianId, relationship)
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.studentGuardian.create).not.toHaveBeenCalled();
    });

    it('should reject linking when student belongs to a different tenant (cross-tenant attack)', async () => {
      const studentFromDifferentTenant: any = {
        id: studentId,
        tenantId: 'tenant-beta', // Different tenant
        admissionNumber: 'ADM-001'
      };
      mockPrisma.student.findUnique.mockResolvedValue(studentFromDifferentTenant);

      await expect(
        service.linkGuardian(tenantId, studentId, guardianId, relationship)
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.studentGuardian.create).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should reject linking when guardian does not exist', async () => {
      const ownedStudent: any = { id: studentId, tenantId };
      mockPrisma.student.findUnique.mockResolvedValue(ownedStudent);
      mockPrisma.guardian.findUnique.mockResolvedValue(null);

      await expect(
        service.linkGuardian(tenantId, studentId, guardianId, relationship)
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.studentGuardian.create).not.toHaveBeenCalled();
    });

    it('should reject linking when guardian belongs to a different tenant (cross-tenant attack)', async () => {
      const ownedStudent: any = { id: studentId, tenantId };
      const foreignGuardian: any = { id: guardianId, tenantId: 'tenant-beta' }; // Different tenant

      mockPrisma.student.findUnique.mockResolvedValue(ownedStudent);
      mockPrisma.guardian.findUnique.mockResolvedValue(foreignGuardian);

      await expect(
        service.linkGuardian(tenantId, studentId, guardianId, relationship)
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.studentGuardian.create).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should succeed and publish event when both student and guardian belong to the same tenant', async () => {
      const ownedStudent: any = { id: studentId, tenantId };
      const ownedGuardian: any = { id: guardianId, tenantId };
      const mockLink: any = { studentId, guardianId, relationship: 'FATHER' };

      mockPrisma.student.findUnique.mockResolvedValue(ownedStudent);
      mockPrisma.guardian.findUnique.mockResolvedValue(ownedGuardian);
      mockPrisma.studentGuardian.create.mockResolvedValue(mockLink);

      const result = await service.linkGuardian(tenantId, studentId, guardianId, relationship);

      expect(mockPrisma.studentGuardian.create).toHaveBeenCalledWith({
        data: { studentId, guardianId, relationship: 'FATHER' }
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.GuardianLinked', {
        tenantId,
        studentId,
        guardianId,
        relationshipType: relationship
      });
      expect(result).toEqual(mockLink);
    });
  });
});
