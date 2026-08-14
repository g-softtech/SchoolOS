import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { DisciplineRecord, Prisma } from '@saas/core-platform';

@Injectable()
export class DisciplineRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStudentId(studentId: string, tenantId: string): Promise<DisciplineRecord[]> {
    return this.prisma.disciplineRecord.findMany({
      where: { studentId, tenantId },
      orderBy: { incidentDate: 'desc' }
    });
  }

  async create(studentId: string, tenantId: string, data: Omit<Prisma.DisciplineRecordCreateInput, 'student' | 'tenant'>): Promise<DisciplineRecord> {
    return this.prisma.disciplineRecord.create({
      data: {
        ...data,
        student: { connect: { id: studentId } },
        tenant: { connect: { id: tenantId } },
      }
    });
  }
}
