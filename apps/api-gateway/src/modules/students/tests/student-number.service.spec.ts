import { StudentNumberService } from '../services/student-number.service';
import { PrismaService } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';

describe('StudentNumberService', () => {
  const mockPrisma = mockDeep<PrismaService>();
  let service: StudentNumberService;

  beforeEach(() => {
    mockReset(mockPrisma);
    service = new StudentNumberService(mockPrisma);
  });

  describe('generateStudentNumber', () => {
    it('should generate correctly padded sequence with year', async () => {
      const mockStrategy = { id: '1', tenantId: 'tenant-1', prefix: 'STU', sequence: 42, year: 2026, createdAt: new Date(), updatedAt: new Date() };
      
      // Mock the transaction callback
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.studentNumberStrategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrisma.studentNumberStrategy.update.mockResolvedValue({ ...mockStrategy, sequence: 43 });

      const result = await service.generateStudentNumber('tenant-1');
      expect(result).toBe('STU-2026-0043');
    });

    it('should create initial strategy if none exists', async () => {
      const mockStrategy = { id: '1', tenantId: 'tenant-1', prefix: 'STU', sequence: 0, year: null, createdAt: new Date(), updatedAt: new Date() };
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.studentNumberStrategy.findUnique.mockResolvedValue(null);
      mockPrisma.studentNumberStrategy.create.mockResolvedValue(mockStrategy);
      mockPrisma.studentNumberStrategy.update.mockResolvedValue({ ...mockStrategy, sequence: 1 });

      const result = await service.generateStudentNumber('tenant-1');
      expect(result).toBe('STU-0001');
      expect(mockPrisma.studentNumberStrategy.create).toHaveBeenCalled();
    });
  });
});
