import { Injectable, BadRequestException } from '@nestjs/common';
import { StudentRepository } from '../repositories/student.repository';
import { StudentNumberService } from './student-number.service';
import { PlatformEventBus } from '@saas/core-platform';
import { CreateStudentProfileDto } from '../dto/student.types';

@Injectable()
export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly numberService: StudentNumberService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async createStudent(tenantId: string, profileData: CreateStudentProfileDto) {
    const studentNumber = await this.numberService.generateStudentNumber(tenantId);

    const student = await this.studentRepo.create({
      tenant: { connect: { id: tenantId } },
      admissionNumber: studentNumber,
      // For testing/compilation purposes. A real implementation would link to the created TenantMembership.
      membership: { connect: { id: 'PLACEHOLDER_MEMBERSHIP_ID' } }
    });
    
    // In a real flow, the Student would be linked to a TenantMembership which has the profile.
    // For now, we align to the Prisma Student schema (which just takes tenantId and admissionNumber).

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
