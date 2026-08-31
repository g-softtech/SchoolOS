import { Injectable, Logger } from '@nestjs/common';
import { FamilyContext } from '../auth/FamilyContext';
import { AssessmentSummaryCard, AnnouncementCard } from '../dto/ViewModels';
import { ResultService } from '../../examinations/services/result.service';
import { PrismaClient } from '@saas/core-platform';

@Injectable()
export class AssessmentFacade {
  private readonly logger = new Logger(AssessmentFacade.name);

  constructor(
    private readonly resultService: ResultService,
    private readonly prisma: PrismaClient
  ) {}

  async getFamilyAssessments(context: FamilyContext, correlationId: string): Promise<AssessmentSummaryCard[]> {
    const cards: AssessmentSummaryCard[] = [];
    
    for (const studentId of context.studentIds) {
      // 1. Resolve student name
      const student = await this.prisma.student.findUnique({
        where: { id: studentId, tenantId: context.tenantId },
        include: { membership: { include: { profile: true } } }
      });
      const firstName = student?.membership?.profile?.firstName || 'Student';

      // 2. Fetch results from Domain interface
      const results = await this.resultService.getRecentResultsForStudent(context.tenantId, studentId);
      
      cards.push({
        studentId,
        firstName,
        recentResults: results.map((r: any) => ({
          subject: r.exam.subject.name,
          grade: r.grade,
          score: Number(r.score),
          publishedAt: r.createdAt,
          teacherRemark: r.remarks || undefined
        })),
        reportCardsAvailable: 0,
        generatedAt: new Date(),
        sourceStatus: 'FRESH',
        correlationId
      });
    }

    return cards;
  }
}

@Injectable()
export class AnnouncementFacade {
  private readonly logger = new Logger(AnnouncementFacade.name);

  async getFamilyAnnouncements(context: FamilyContext, correlationId: string): Promise<AnnouncementCard[]> {
    // 🛑 LIMITATION: No Communication/Announcement persistence source exists in Prisma schema.
    // Leaving explicitly empty rather than manufacturing fake announcements.
    this.logger.debug(`AnnouncementFacade returning empty array. Communications module not implemented. [CorrID: ${correlationId}]`);
    return [];
  }
}
