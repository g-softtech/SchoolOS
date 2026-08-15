import { StudentRepository } from '../repositories/student.repository';
import { PrismaService } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';

describe('StudentRepository', () => {
  const mockPrisma = mockDeep<PrismaService>();
  let repository: StudentRepository;

  beforeEach(() => {
    mockReset(mockPrisma);
    repository = new StudentRepository(mockPrisma);
  });

  describe('create', () => {
    it('should call prisma.student.create with provided data', async () => {
      const inputData: any = {
        tenant: { connect: { id: 'tenant-1' } },
        admissionNumber: 'STU-001',
        membership: { connect: { id: 'mem-1' } }
      };
      const mockResult: any = { id: 'stu-1', tenantId: 'tenant-1', admissionNumber: 'STU-001' };
      mockPrisma.student.create.mockResolvedValue(mockResult);

      const result = await repository.create(inputData);

      expect(mockPrisma.student.create).toHaveBeenCalledWith({ data: inputData });
      expect(result).toEqual(mockResult);
    });
  });

  describe('findById', () => {
    it('should return a student with membership and guardians when found', async () => {
      const mockStudent: any = {
        id: 'stu-1',
        tenantId: 'tenant-1',
        admissionNumber: 'STU-001',
        membership: { profile: { firstName: 'Jane', lastName: 'Doe' }, state: 'ACTIVE' },
        guardians: []
      };
      mockPrisma.student.findUnique.mockResolvedValue(mockStudent);

      const result = await repository.findById('stu-1', 'tenant-1');

      expect(mockPrisma.student.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'stu-1', tenantId: 'tenant-1' } })
      );
      expect(result).toEqual(mockStudent);
    });

    it('should return null when student is not found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      const result = await repository.findById('not-exist', 'tenant-1');
      expect(result).toBeNull();
    });
  });

  describe('findByMembershipId', () => {
    it('should return a student matched by membershipId and tenantId', async () => {
      const mockStudent: any = { id: 'stu-1', membershipId: 'mem-1', tenantId: 'tenant-1' };
      mockPrisma.student.findUnique.mockResolvedValue(mockStudent);

      const result = await repository.findByMembershipId('mem-1', 'tenant-1');

      expect(mockPrisma.student.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { membershipId: 'mem-1', tenantId: 'tenant-1' } })
      );
      expect(result).toEqual(mockStudent);
    });
  });

  describe('findManyWithPagination', () => {
    it('should pass tenantId and pagination params to prisma', async () => {
      const mockStudents: any[] = [
        { id: 'stu-1', tenantId: 'tenant-1' },
        { id: 'stu-2', tenantId: 'tenant-1' }
      ];
      mockPrisma.student.findMany.mockResolvedValue(mockStudents);

      const result = await repository.findManyWithPagination('tenant-1', { limit: 10 });

      expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
          take: 10
        })
      );
      expect(result).toEqual(mockStudents);
    });

    it('should apply cursor pagination when cursor is provided', async () => {
      mockPrisma.student.findMany.mockResolvedValue([]);

      await repository.findManyWithPagination('tenant-1', { cursor: 'stu-cursor-1', limit: 5 });

      expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'stu-cursor-1' },
          skip: 1,
          take: 5
        })
      );
    });
  });

  describe('update', () => {
    it('should call prisma.student.update with correct args', async () => {
      const mockUpdated: any = { id: 'stu-1', tenantId: 'tenant-1' };
      mockPrisma.student.update.mockResolvedValue(mockUpdated);

      const result = await repository.update('stu-1', 'tenant-1', { enrollmentDate: new Date() } as any);

      expect(mockPrisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'stu-1', tenantId: 'tenant-1' } })
      );
      expect(result).toEqual(mockUpdated);
    });
  });
});
