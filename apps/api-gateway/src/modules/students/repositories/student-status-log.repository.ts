import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { StudentStatusLog, Prisma } from '@saas/core-platform';

@Injectable()
export class StudentStatusLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StudentStatusLogCreateInput): Promise<StudentStatusLog> {
    return this.prisma.studentStatusLog.create({ data });
  }

  async findByStudentId(studentId: string): Promise<StudentStatusLog[]> {
    return this.prisma.studentStatusLog.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
