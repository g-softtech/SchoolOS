import { StudentRepository } from '../repositories/student.repository';
import { PrismaService } from '@saas/core-platform';
import { StudentStatus } from '../dto/student.types';

describe('StudentRepository Integration', () => {
  let prisma: PrismaService;
  let repository: StudentRepository;
  const tenantId = 'test-tenant';

  beforeAll(async () => {
    prisma = new PrismaService();
    repository = new StudentRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create and findById', () => {
    it('should create a student and fetch it with profile', async () => {
      // Setup - optionally clean up old data if needed, assuming isolated test db
      const studentNumber = `STU-TEST-${Date.now()}`;
      
      const created = await repository.create({
        tenantId,
        studentNumber,
        status: StudentStatus.PENDING,
        profile: {
          create: {
            firstName: 'Integration',
            lastName: 'Test',
            dateOfBirth: new Date('2015-01-01')
          }
        }
      });

      expect(created.id).toBeDefined();
      expect(created.studentNumber).toBe(studentNumber);
      
      const fetched = await repository.findById(created.id, tenantId);
      expect(fetched).not.toBeNull();
      expect(fetched!.profile).not.toBeNull();
      expect(fetched!.profile!.firstName).toBe('Integration');
    });
  });

  describe('update (Optimistic Locking / Ledger simulation)', () => {
    it('should update a student', async () => {
      const studentNumber = `STU-TEST-${Date.now()}`;
      const created = await repository.create({
        tenantId,
        studentNumber,
        status: StudentStatus.PENDING
      });

      const updated = await repository.update(created.id, tenantId, { status: StudentStatus.ACTIVE });
      
      expect(updated.status).toBe(StudentStatus.ACTIVE);
      
      // Verify via fetch
      const fetched = await repository.findById(created.id, tenantId);
      expect(fetched!.status).toBe(StudentStatus.ACTIVE);
    });
  });
});
