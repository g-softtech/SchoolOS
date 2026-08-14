import { Injectable, BadRequestException } from '@nestjs/common';
import { StudentRepository } from '../repositories/student.repository';
import { StudentNumberService } from './student-number.service';
import { PlatformEventBus } from '@saas/core-platform';
import { IdentityProvisioningService } from '../../identity/services/identity-provisioning.service';
import { CreateStudentProfileDto } from '../dto/student.types';

@Injectable()
export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly numberService: StudentNumberService,
    private readonly eventBus: PlatformEventBus,
    private readonly identityProvisioningService: IdentityProvisioningService
  ) {}

  async enrollStudentFromApplication(tenantId: string, applicationId: string, profileData: CreateStudentProfileDto) {
    // 1. Generate deterministic surrogate email
    const surrogateEmail = `student-${applicationId}@${tenantId}.system.internal`;

    // 2. Provision Identity (Idempotent)
    const membership = await this.identityProvisioningService.provisionWorkspaceMember({
      tenantId,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: surrogateEmail,
      roleName: 'STUDENT',
      dateOfBirth: profileData.dateOfBirth
    });

    // 3. Ensure we don't duplicate the student record
    const existingStudent = await this.studentRepo.findFirst({
      where: { membershipId: membership.id, tenantId }
    });

    if (existingStudent) {
      return existingStudent;
    }

    // 4. Create Canonical Student
    const studentNumber = await this.numberService.generateStudentNumber(tenantId);

    const student = await this.studentRepo.create({
      tenant: { connect: { id: tenantId } },
      admissionNumber: studentNumber,
      membership: { connect: { id: membership.id } }
    });
    
    await this.eventBus.publish('Student.Created', {
      tenantId,
      studentId: student.id,
      studentNumber
    });

    return student;
  }

  async getStudent(id: string, tenantId: string) {
    const student = await this.studentRepo.findById(id, tenantId);
    if (!student) throw new BadRequestException('Student not found');
    return student;
  }
}
