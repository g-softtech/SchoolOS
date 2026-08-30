import { Injectable, Logger } from '@nestjs/common';
import { FamilyContext } from '../auth/FamilyContext';
import { AssessmentSummaryCard, AnnouncementCard } from '../dto/ViewModels';
// import { ResultReadService } from '@saas/core-platform'; // MISSING DEPENDENCY

@Injectable()
export class AssessmentFacade {
  private readonly logger = new Logger(AssessmentFacade.name);

  async getFamilyAssessments(context: FamilyContext, correlationId: string): Promise<AssessmentSummaryCard[]> {
    // 🛑 BLOCKER: Phase 14 (Examinations) does not expose a student-centric read interface.
    // We refuse to bypass the domain by writing a parallel Prisma query here.
    // Missing Interface: ResultReadService.getRecentResultsForStudent(tenantId, studentId)
    this.logger.warn(`AssessmentFacade returning empty array. Missing Phase 14 ResultReadService for correlation: ${correlationId}`);
    return [];
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
