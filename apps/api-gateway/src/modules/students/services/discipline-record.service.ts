import { Injectable, NotFoundException } from '@nestjs/common';
import { DisciplineRecordRepository } from '../repositories/discipline-record.repository';
import { StudentRepository } from '../repositories/student.repository';
import { PlatformEventBus } from '@saas/core-platform';
import { Prisma } from '@saas/core-platform';

@Injectable()
export class DisciplineRecordService {
  constructor(
    private readonly disciplineRecordRepo: DisciplineRecordRepository,
    private readonly studentRepo: StudentRepository,
    private readonly eventBus: PlatformEventBus,
  ) {}

  async getDisciplineRecords(studentId: string, tenantId: string) {
    const student = await this.studentRepo.findById(studentId, tenantId);
    if (!student) throw new NotFoundException('Student not found');
    
    return this.disciplineRecordRepo.findByStudentId(studentId, tenantId);
  }

  async addDisciplineRecord(
    studentId: string,
    tenantId: string,
    data: Omit<Prisma.DisciplineRecordCreateInput, 'student' | 'tenant'>
  ) {
    const student = await this.studentRepo.findById(studentId, tenantId);
    if (!student) throw new NotFoundException('Student not found');

    const record = await this.disciplineRecordRepo.create(studentId, tenantId, data);

    await this.eventBus.publish('Student.DisciplineRecordCreated', {
      tenantId,
      studentId,
      disciplineRecordId: record.id,
      severity: record.severity
    });

    return record;
  }
}
