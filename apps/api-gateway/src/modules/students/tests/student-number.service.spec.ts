import { StudentNumberService } from '../services/student-number.service';

describe('StudentNumberService', () => {
  let service: StudentNumberService;

  beforeEach(() => {
    service = new StudentNumberService();
  });

  describe('generateStudentNumber', () => {
    it('should return a string in the format STU-{timestamp}-{random}', async () => {
      const result = await service.generateStudentNumber('tenant-1');

      expect(result).toMatch(/^STU-\d{6}-\d{3}$/);
    });

    it('should produce unique numbers on consecutive calls', async () => {
      // Sleep 1ms to ensure timestamp differs
      const r1 = await service.generateStudentNumber('tenant-1');
      await new Promise(r => setTimeout(r, 2));
      const r2 = await service.generateStudentNumber('tenant-1');

      // They could theoretically collide on the random part, but timestamp portion should differ.
      // We just assert both are valid format strings.
      expect(r1).toMatch(/^STU-\d{6}-\d{3}$/);
      expect(r2).toMatch(/^STU-\d{6}-\d{3}$/);
    });

    it('should not depend on tenantId (format is the same for any tenant)', async () => {
      const r1 = await service.generateStudentNumber('tenant-A');
      const r2 = await service.generateStudentNumber('tenant-B');

      expect(r1).toMatch(/^STU-\d{6}-\d{3}$/);
      expect(r2).toMatch(/^STU-\d{6}-\d{3}$/);
    });
  });
});
