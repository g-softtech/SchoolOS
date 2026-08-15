import { StudentLifecycleService } from '../services/student-lifecycle.service';
import { IdentityState } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PlatformEventBus } from '@saas/core-platform';
import { StudentRepository } from '../repositories/student.repository';
import { IdentityProvisioningService } from '../../identity/services/identity-provisioning.service';
import { BadRequestException } from '@nestjs/common';

describe('StudentLifecycleService', () => {
  const mockStudentRepo = mockDeep<StudentRepository>();
  const mockEventBus = mockDeep<PlatformEventBus>();
  const mockIdentityService = mockDeep<IdentityProvisioningService>();

  let service: StudentLifecycleService;

  beforeEach(() => {
    mockReset(mockStudentRepo);
    mockReset(mockEventBus);
    mockReset(mockIdentityService);

    service = new StudentLifecycleService(
      mockStudentRepo,
      mockEventBus,
      mockIdentityService
    );
  });

  describe('transitionStatus', () => {
    it('should throw BadRequestException if student does not exist', async () => {
      mockStudentRepo.findById.mockResolvedValue(null);

      await expect(
        service.transitionStatus('123', 'tenant-1', IdentityState.ACTIVE, 'actor-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing student without transition if status is already target status', async () => {
      const mockStudent: any = {
        id: '123',
        membershipId: 'mem-1',
        admissionNumber: 'STU-001',
        membership: { state: IdentityState.ACTIVE }
      };
      mockStudentRepo.findById.mockResolvedValue(mockStudent);

      const result = await service.transitionStatus('123', 'tenant-1', IdentityState.ACTIVE, 'actor-1');

      expect(result).toEqual(mockStudent);
      expect(mockIdentityService.transitionMembershipState).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should call transitionMembershipState and publish Student.StatusChanged event', async () => {
      const mockStudent: any = {
        id: '123',
        membershipId: 'mem-1',
        admissionNumber: 'STU-001',
        membership: { state: IdentityState.PROVISIONED }
      };
      const updatedStudent: any = {
        ...mockStudent,
        membership: { state: IdentityState.SUSPENDED }
      };

      mockStudentRepo.findById
        .mockResolvedValueOnce(mockStudent)   // first call to verify existence
        .mockResolvedValueOnce(updatedStudent); // second call to return updated

      mockIdentityService.transitionMembershipState.mockResolvedValue(undefined as any);

      await service.transitionStatus('123', 'tenant-1', IdentityState.SUSPENDED, 'actor-1', 'Violation');

      expect(mockIdentityService.transitionMembershipState).toHaveBeenCalledWith(
        'mem-1', 'tenant-1', IdentityState.SUSPENDED, 'actor-1', 'Violation'
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.StatusChanged', {
        tenantId: 'tenant-1',
        studentId: '123',
        previousStatus: IdentityState.PROVISIONED,
        newStatus: IdentityState.SUSPENDED,
        reason: 'Violation'
      });
    });

    it('should publish Student.Activated event when transitioning to ACTIVE', async () => {
      const mockStudent: any = {
        id: '123',
        membershipId: 'mem-1',
        admissionNumber: 'STU-001',
        membership: { state: IdentityState.PENDING_ACTIVATION }
      };
      mockStudentRepo.findById.mockResolvedValue(mockStudent);
      mockIdentityService.transitionMembershipState.mockResolvedValue(undefined as any);

      await service.transitionStatus('123', 'tenant-1', IdentityState.ACTIVE, 'actor-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.Activated', {
        tenantId: 'tenant-1',
        studentId: '123',
        studentNumber: 'STU-001'
      });
    });

    it('should publish Student.Archived event when transitioning to ARCHIVED', async () => {
      const mockStudent: any = {
        id: '123',
        membershipId: 'mem-1',
        admissionNumber: 'STU-001',
        membership: { state: IdentityState.SUSPENDED }
      };
      mockStudentRepo.findById.mockResolvedValue(mockStudent);
      mockIdentityService.transitionMembershipState.mockResolvedValue(undefined as any);

      await service.transitionStatus('123', 'tenant-1', IdentityState.ARCHIVED, 'actor-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith('Student.Archived', {
        tenantId: 'tenant-1',
        studentId: '123',
        studentNumber: 'STU-001'
      });
    });
  });
});
