import { StudentLifecycleService } from '../services/student-lifecycle.service';
import { StudentStatus } from '../dto/student.types';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PlatformEventBus } from '@saas/core-platform';
import { StudentStatusLogRepository } from '../repositories/student-status-log.repository';
import { StudentRepository } from '../repositories/student.repository';
import { BadRequestException } from '@nestjs/common';

describe('StudentLifecycleService', () => {
  const mockStatusLogRepo = mockDeep<StudentStatusLogRepository>();
  const mockStudentRepo = mockDeep<StudentRepository>();
  const mockEventBus = mockDeep<PlatformEventBus>();

  let service: StudentLifecycleService;

  beforeEach(() => {
    mockReset(mockStatusLogRepo);
    mockReset(mockStudentRepo);
    mockReset(mockEventBus);
    
    service = new StudentLifecycleService(
      mockStatusLogRepo,
      mockStudentRepo,
      mockEventBus
    );
  });

  describe('transitionStatus', () => {
    it('should throw BadRequestException if student does not exist', async () => {
      mockStudentRepo.findById.mockResolvedValue(null);

      await expect(
        service.transitionStatus('123', 'tenant-1', StudentStatus.ACTIVE, 'actor-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing student if status is already target status', async () => {
      const mockStudent: any = { id: '123', status: StudentStatus.ACTIVE };
      mockStudentRepo.findById.mockResolvedValue(mockStudent);

      const result = await service.transitionStatus('123', 'tenant-1', StudentStatus.ACTIVE, 'actor-1');
      
      expect(result).toEqual(mockStudent);
      expect(mockStatusLogRepo.create).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should append to status history, update aggregate, and publish base event', async () => {
      const mockStudent: any = { id: '123', status: StudentStatus.PENDING, studentNumber: 'STU-001' };
      const updatedStudent: any = { ...mockStudent, status: StudentStatus.SUSPENDED };

      mockStudentRepo.findById.mockResolvedValue(mockStudent);
      mockStudentRepo.update.mockResolvedValue(updatedStudent);

      await service.transitionStatus('123', 'tenant-1', StudentStatus.SUSPENDED, 'actor-1', 'Violation');

      expect(mockStatusLogRepo.create).toHaveBeenCalledWith({
        studentId: '123',
        previousStatus: StudentStatus.PENDING,
        newStatus: StudentStatus.SUSPENDED,
        reason: 'Violation',
        actorId: 'actor-1'
      });

      expect(mockStudentRepo.update).toHaveBeenCalledWith('123', 'tenant-1', { status: StudentStatus.SUSPENDED });

      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.StatusChanged', {
        tenantId: 'tenant-1',
        studentId: '123',
        previousStatus: StudentStatus.PENDING,
        newStatus: StudentStatus.SUSPENDED
      });
    });

    it('should publish Student.Activated event when status changes to ACTIVE', async () => {
      const mockStudent: any = { id: '123', status: StudentStatus.PENDING, studentNumber: 'STU-001' };
      const updatedStudent: any = { ...mockStudent, status: StudentStatus.ACTIVE };

      mockStudentRepo.findById.mockResolvedValue(mockStudent);
      mockStudentRepo.update.mockResolvedValue(updatedStudent);

      await service.transitionStatus('123', 'tenant-1', StudentStatus.ACTIVE, 'actor-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.Activated', {
        tenantId: 'tenant-1',
        studentId: '123',
        studentNumber: 'STU-001'
      });
    });

    it('should publish Student.Archived event when status changes to ARCHIVED', async () => {
      const mockStudent: any = { id: '123', status: StudentStatus.WITHDRAWN, studentNumber: 'STU-001' };
      const updatedStudent: any = { ...mockStudent, status: StudentStatus.ARCHIVED };

      mockStudentRepo.findById.mockResolvedValue(mockStudent);
      mockStudentRepo.update.mockResolvedValue(updatedStudent);

      await service.transitionStatus('123', 'tenant-1', StudentStatus.ARCHIVED, 'actor-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.Archived', {
        tenantId: 'tenant-1',
        studentId: '123'
      });
    });
  });
});
