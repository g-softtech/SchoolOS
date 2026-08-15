import { StudentPlacementService } from '../services/student-placement.service';
import { PrismaService, PlatformEventBus } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';

describe('StudentPlacementService', () => {
  const mockPrisma = mockDeep<PrismaService>();
  const mockEventBus = mockDeep<PlatformEventBus>();
  let service: StudentPlacementService;

  beforeEach(() => {
    mockReset(mockPrisma);
    mockReset(mockEventBus);
    service = new StudentPlacementService(mockPrisma, mockEventBus);
  });

  describe('placeStudentInArm', () => {
    it('should throw NotFoundException if student does not exist', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.placeStudentInArm('t1', 's1', { armId: 'a1' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if student belongs to another tenant', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', tenantId: 't2' } as any);

      await expect(
        service.placeStudentInArm('t1', 's1', { armId: 'a1' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if arm does not exist or belongs to another tenant', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', tenantId: 't1' } as any);
      mockPrisma.arm.findUnique.mockResolvedValue({ id: 'a1', tenantId: 't2' } as any);

      await expect(
        service.placeStudentInArm('t1', 's1', { armId: 'a1' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully place student in arm and publish event', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', tenantId: 't1', currentArmId: null } as any);
      mockPrisma.arm.findUnique.mockResolvedValue({ id: 'a1', tenantId: 't1', classId: 'c1' } as any);
      mockPrisma.student.update.mockResolvedValue({ id: 's1', currentArmId: 'a1' } as any);

      const result = await service.placeStudentInArm('t1', 's1', { armId: 'a1' });

      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { currentArmId: 'a1' }
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.PlacedInArm', {
        tenantId: 't1',
        studentId: 's1',
        armId: 'a1',
        classId: 'c1',
        previousArmId: null
      });

      expect(result.currentArmId).toBe('a1');
    });

    it('should successfully reassign student to a new arm and include previousArmId in event', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', tenantId: 't1', currentArmId: 'oldA1' } as any);
      mockPrisma.arm.findUnique.mockResolvedValue({ id: 'newA1', tenantId: 't1', classId: 'c1' } as any);
      mockPrisma.student.update.mockResolvedValue({ id: 's1', currentArmId: 'newA1' } as any);

      const result = await service.placeStudentInArm('t1', 's1', { armId: 'newA1' });

      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.PlacedInArm', {
        tenantId: 't1',
        studentId: 's1',
        armId: 'newA1',
        classId: 'c1',
        previousArmId: 'oldA1'
      });

      expect(result.currentArmId).toBe('newA1');
    });
  });
});
