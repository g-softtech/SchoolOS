import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { MedicalRecord, Prisma } from '@saas/core-platform';

@Injectable()
export class MedicalRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStudentId(studentId: string, tenantId: string): Promise<MedicalRecord | null> {
    return this.prisma.medicalRecord.findFirst({
      where: { studentId, tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async upsert(studentId: string, tenantId: string, data: Omit<Prisma.MedicalRecordCreateInput, 'student' | 'tenant'>): Promise<MedicalRecord> {
    const existing = await this.findByStudentId(studentId, tenantId);
    if (existing) {
      return this.prisma.medicalRecord.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return this.prisma.medicalRecord.create({
        data: {
          ...data,
          student: { connect: { id: studentId } },
          tenant: { connect: { id: tenantId } },
        }
      });
    }
  }
}
