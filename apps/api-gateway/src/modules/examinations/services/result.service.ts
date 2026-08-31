import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class ResultService {
  private readonly logger = new Logger(ResultService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identifies eligible students for an exam by checking if their current Arm
   * belongs to a Class that is linked to the Exam's Subject.
   */
  async getEligibleCandidates(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, tenantId },
      include: {
        subject: true
      }
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // A subject is linked to multiple classes. Students are linked to Arms. Arms are linked to Classes.
    const eligibleStudents = await this.prisma.student.findMany({
      where: {
        tenantId,
        currentArm: {
          class: {
            subjects: {
              some: {
                id: exam.subjectId
              }
            }
          }
        }
      },
      include: {
        membership: {
          include: {
            profile: true
          }
        },
        currentArm: {
          include: {
            class: true
          }
        }
      },
      orderBy: {
        admissionNumber: 'asc'
      }
    });

    // Also fetch their existing results for this exam, if any
    const existingResults = await this.prisma.result.findMany({
      where: { tenantId, examId }
    });

    return eligibleStudents.map(student => {
      const result = existingResults.find(r => r.studentId === student.id);
      return {
        student,
        result: result || null
      };
    });
  }

  /**
   * Safely batch upserts results within a transaction to ensure database consistency.
   * Validates scores against Exam's totalMarks before writing.
   */
  async batchEnterResults(
    tenantId: string, 
    examId: string, 
    results: { studentId: string; score: number; remarks?: string }[]
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, tenantId }
    });

    if (!exam) throw new NotFoundException('Exam not found');

    const totalMarks = Number(exam.totalMarks);

    // Score validation
    for (const r of results) {
      if (r.score < 0 || r.score > totalMarks) {
        throw new BadRequestException(`Score ${r.score} for student ${r.studentId} exceeds maximum marks (${totalMarks}).`);
      }
    }

    // Execute safe upsert batch in transaction
    const upserts = results.map(r => {
      // Calculate grade (simple example mapping; can be extended)
      let grade = 'F';
      const percentage = (r.score / totalMarks) * 100;
      if (percentage >= 70) grade = 'A';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C';
      else if (percentage >= 40) grade = 'D';
      else if (percentage >= 30) grade = 'E';

      return this.prisma.result.upsert({
        where: {
          tenantId_examId_studentId: {
            tenantId,
            examId,
            studentId: r.studentId
          }
        },
        create: {
          tenantId,
          examId,
          studentId: r.studentId,
          score: r.score,
          grade,
          remarks: r.remarks
        },
        update: {
          score: r.score,
          grade,
          remarks: r.remarks
        }
      });
    });

    await this.prisma.$transaction(upserts);
    this.logger.log(`Upserted ${upserts.length} results for exam ${examId}`);
    return { success: true, count: upserts.length };
  }

  /**
   * Retrieves the most recent results for a specific student, bounded by limit.
   */
  async getRecentResultsForStudent(tenantId: string, studentId: string, limit: number = 5) {
    // 1. Verify student exists and belongs to the tenant
    const student = await this.prisma.student.findUnique({
      where: { id: studentId, tenantId },
    });
    
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 2. Fetch the student's recent results, including the Exam and Subject metadata
    const results = await this.prisma.result.findMany({
      where: { tenantId, studentId },
      include: {
        exam: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return results;
  }
}
