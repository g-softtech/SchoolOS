import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createExam(
    tenantId: string,
    termId: string,
    subjectId: string,
    title: string,
    totalMarks: number,
    isCBT: boolean,
    date: Date,
  ) {
    this.logger.debug(`Creating Exam for tenant ${tenantId}, subject ${subjectId}`);
    return this.prisma.exam.create({
      data: {
        tenantId,
        termId,
        subjectId,
        title,
        totalMarks,
        isCBT,
        date,
      },
    });
  }

  async getExams(tenantId: string) {
    return this.prisma.exam.findMany({
      where: { tenantId },
      include: {
        subject: true,
        term: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getExamById(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: true,
        term: true,
      },
    });

    if (!exam || exam.tenantId !== tenantId) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  async deleteExam(tenantId: string, examId: string) {
    const exam = await this.getExamById(tenantId, examId);
    return this.prisma.exam.delete({
      where: { id: exam.id },
    });
  }
}
