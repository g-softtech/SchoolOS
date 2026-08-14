import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MedicalRecordRepository } from '../repositories/medical-record.repository';
import { StudentRepository } from '../repositories/student.repository';
import { PlatformEventBus } from '@saas/core-platform';
import { Prisma } from '@saas/core-platform';

@Injectable()
export class MedicalRecordService {
  constructor(
    private readonly medicalRecordRepo: MedicalRecordRepository,
    private readonly studentRepo: StudentRepository,
    private readonly eventBus: PlatformEventBus,
  ) {}

  async getMedicalRecord(studentId: string, tenantId: string) {
    const student = await this.studentRepo.findById(studentId, tenantId);
    if (!student) throw new NotFoundException('Student not found');
    
    return this.medicalRecordRepo.findByStudentId(studentId, tenantId);
  }

  async upsertMedicalRecord(
    studentId: string,
    tenantId: string,
    data: Omit<Prisma.MedicalRecordCreateInput, 'student' | 'tenant'>
  ) {
    const student = await this.studentRepo.findById(studentId, tenantId);
    if (!student) throw new NotFoundException('Student not found');

    const record = await this.medicalRecordRepo.upsert(studentId, tenantId, data);

    await this.eventBus.publish('Student.MedicalRecordUpdated', {
      tenantId,
      studentId,
      medicalRecordId: record.id,
    });

    return record;
  }
}
