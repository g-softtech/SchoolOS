import { InstitutionalStructureService } from '../services/institutional-structure.service';
import { PrismaService, PlatformEventBus } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('InstitutionalStructureService', () => {
  const mockPrisma = mockDeep<PrismaService>();
  const mockEventBus = mockDeep<PlatformEventBus>();
  let service: InstitutionalStructureService;

  beforeEach(() => {
    mockReset(mockPrisma);
    mockReset(mockEventBus);
    service = new InstitutionalStructureService(mockPrisma, mockEventBus);
  });

  describe('createArm', () => {
    it('should throw NotFoundException if class does not exist or belongs to another tenant', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'c1', tenantId: 't2' } as any);

      await expect(
        service.createArm('t1', { classId: 'c1', name: '10A' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if arm name already exists for class', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'c1', tenantId: 't1' } as any);
      mockPrisma.arm.findUnique.mockResolvedValue({ id: 'a1' } as any);

      await expect(
        service.createArm('t1', { classId: 'c1', name: '10A' })
      ).rejects.toThrow(ConflictException);
    });

    it('should create an arm successfully', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'c1', tenantId: 't1' } as any);
      mockPrisma.arm.findUnique.mockResolvedValue(null);
      mockPrisma.arm.create.mockResolvedValue({ id: 'a1', name: '10A' } as any);

      const result = await service.createArm('t1', { classId: 'c1', name: '10A' });

      expect(mockPrisma.arm.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: 't1', classId: 'c1', name: '10A' })
      });
      expect(result.id).toEqual('a1');
    });
  });

  describe('createSubject', () => {
    it('should throw NotFoundException if subjectGroupId is provided but invalid', async () => {
      mockPrisma.subjectGroup.findUnique.mockResolvedValue({ id: 'sg1', tenantId: 't2' } as any);

      await expect(
        service.createSubject('t1', { name: 'Math', code: 'MTH', subjectGroupId: 'sg1' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if subject code already exists in tenant', async () => {
      mockPrisma.subject.findUnique.mockResolvedValue({ id: 's1' } as any);

      await expect(
        service.createSubject('t1', { name: 'Math', code: 'MTH' })
      ).rejects.toThrow(ConflictException);
    });

    it('should create subject successfully', async () => {
      mockPrisma.subject.findUnique.mockResolvedValue(null);
      mockPrisma.subject.create.mockResolvedValue({ id: 's2', code: 'SCI' } as any);

      const result = await service.createSubject('t1', { name: 'Science', code: 'SCI' });

      expect(result.code).toEqual('SCI');
    });
  });

  describe('mapClassSubjects', () => {
    it('should throw NotFoundException if class is invalid', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.mapClassSubjects('t1', 'c1', ['s1'])).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if one or more subjects are invalid', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'c1', tenantId: 't1' } as any);
      // Mock returning only 1 subject when 2 were requested
      mockPrisma.subject.findMany.mockResolvedValue([{ id: 's1' }] as any);

      await expect(service.mapClassSubjects('t1', 'c1', ['s1', 's2'])).rejects.toThrow(BadRequestException);
    });

    it('should map subjects to class successfully', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'c1', tenantId: 't1' } as any);
      mockPrisma.subject.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }] as any);
      mockPrisma.class.update.mockResolvedValue({ id: 'c1', subjects: [{ id: 's1' }, { id: 's2' }] } as any);

      const result = await service.mapClassSubjects('t1', 'c1', ['s1', 's2']);

      expect(mockPrisma.class.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: {
          subjects: {
            set: [{ id: 's1' }, { id: 's2' }]
          }
        },
        include: { subjects: true }
      });
      expect(result.id).toEqual('c1');
    });
  });
});
