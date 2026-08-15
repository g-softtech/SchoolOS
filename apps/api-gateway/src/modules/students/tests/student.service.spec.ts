import { StudentService } from '../services/student.service';
import { StudentRepository } from '../repositories/student.repository';
import { StudentNumberService } from '../services/student-number.service';
import { PlatformEventBus } from '@saas/core-platform';
import { IdentityProvisioningService } from '../../identity/services/identity-provisioning.service';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { BadRequestException } from '@nestjs/common';

describe('StudentService', () => {
  const mockStudentRepo = mockDeep<StudentRepository>();
  const mockNumberService = mockDeep<StudentNumberService>();
  const mockEventBus = mockDeep<PlatformEventBus>();
  const mockIdentityService = mockDeep<IdentityProvisioningService>();

  let service: StudentService;

  beforeEach(() => {
    mockReset(mockStudentRepo);
    mockReset(mockNumberService);
    mockReset(mockEventBus);
    mockReset(mockIdentityService);

    service = new StudentService(
      mockStudentRepo,
      mockNumberService,
      mockEventBus,
      mockIdentityService
    );
  });

  describe('enrollStudentFromApplication', () => {
    it('should provision identity, create student, and publish event', async () => {
      const mockMembership: any = { id: 'membership-1' };
      mockIdentityService.provisionWorkspaceMember.mockResolvedValue(mockMembership);
      mockStudentRepo.findByMembershipId.mockResolvedValue(null); // No existing student
      mockNumberService.generateStudentNumber.mockResolvedValue('STU-123456-001');
      const mockStudent: any = { id: 'stu-1', admissionNumber: 'STU-123456-001', membershipId: 'membership-1' };
      mockStudentRepo.create.mockResolvedValue(mockStudent);

      const profileData = { firstName: 'Jane', lastName: 'Doe', dateOfBirth: new Date('2010-01-01') };
      const result = await service.enrollStudentFromApplication('tenant-1', 'app-123', profileData);

      expect(mockIdentityService.provisionWorkspaceMember).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'student-app-123@tenant-1.system.internal',
        roleName: 'STUDENT',
        dateOfBirth: profileData.dateOfBirth
      });
      expect(mockStudentRepo.findByMembershipId).toHaveBeenCalledWith('membership-1', 'tenant-1');
      expect(mockNumberService.generateStudentNumber).toHaveBeenCalledWith('tenant-1');
      expect(mockStudentRepo.create).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.Created', {
        tenantId: 'tenant-1',
        studentId: 'stu-1',
        studentNumber: 'STU-123456-001'
      });
      expect(result).toEqual(mockStudent);
    });

    it('should return existing student without duplication if already enrolled', async () => {
      const mockMembership: any = { id: 'membership-1' };
      const existingStudent: any = { id: 'stu-existing', admissionNumber: 'STU-OLD-001', membershipId: 'membership-1' };

      mockIdentityService.provisionWorkspaceMember.mockResolvedValue(mockMembership);
      mockStudentRepo.findByMembershipId.mockResolvedValue(existingStudent);

      const profileData = { firstName: 'Jane', lastName: 'Doe', dateOfBirth: new Date('2010-01-01') };
      const result = await service.enrollStudentFromApplication('tenant-1', 'app-123', profileData);

      expect(mockStudentRepo.create).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
      expect(result).toEqual(existingStudent);
    });
  });

  describe('getStudent', () => {
    it('should return student if found', async () => {
      const mockStudent: any = { id: 'stu-1', admissionNumber: 'STU-001' };
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
