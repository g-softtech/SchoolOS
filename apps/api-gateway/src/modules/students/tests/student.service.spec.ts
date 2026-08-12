import { StudentService } from '../services/student.service';
import { StudentRepository } from '../repositories/student.repository';
import { StudentNumberService } from '../services/student-number.service';
import { PlatformEventBus } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { BadRequestException } from '@nestjs/common';
import { StudentStatus } from '../dto/student.types';

describe('StudentService', () => {
  const mockStudentRepo = mockDeep<StudentRepository>();
  const mockNumberService = mockDeep<StudentNumberService>();
  const mockEventBus = mockDeep<PlatformEventBus>();

  let service: StudentService;

  beforeEach(() => {
    mockReset(mockStudentRepo);
    mockReset(mockNumberService);
    mockReset(mockEventBus);
    
    service = new StudentService(mockStudentRepo, mockNumberService, mockEventBus);
  });

  describe('createStudent', () => {
    it('should generate number, create student, and publish event', async () => {
      mockNumberService.generateStudentNumber.mockResolvedValue('STU-001');
      const mockStudent: any = { id: 'stu-1', tenantId: 'tenant-1', studentNumber: 'STU-001', status: StudentStatus.PENDING };
      mockStudentRepo.create.mockResolvedValue(mockStudent);

      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01')
      };

      const result = await service.createStudent('tenant-1', profileData);

      expect(mockNumberService.generateStudentNumber).toHaveBeenCalledWith('tenant-1');
      expect(mockStudentRepo.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        studentNumber: 'STU-001',
        profile: {
          create: profileData
        }
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.Created', {
        tenantId: 'tenant-1',
        studentId: 'stu-1',
        studentNumber: 'STU-001'
      });
      expect(result).toEqual(mockStudent);
    });
  });

  describe('getStudent', () => {
    it('should return student if found', async () => {
      const mockStudent: any = { id: 'stu-1' };
      mockStudentRepo.findById.mockResolvedValue(mockStudent);

      const result = await service.getStudent('stu-1', 'tenant-1');
      expect(result).toEqual(mockStudent);
    });

    it('should throw BadRequestException if not found', async () => {
      mockStudentRepo.findById.mockResolvedValue(null);

      await expect(service.getStudent('stu-1', 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });
});
