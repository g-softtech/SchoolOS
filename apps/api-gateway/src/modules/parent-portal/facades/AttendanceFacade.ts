import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@saas/core-platform';
import { FamilyContext } from '../auth/FamilyContext';
import { ChildAttendanceCard } from '../dto/ViewModels';

@Injectable()
export class AttendanceFacade {
  constructor(
    private readonly prisma: PrismaClient
  ) {}

  async getFamilyAttendanceSummary(context: FamilyContext, correlationId: string): Promise<ChildAttendanceCard[]> {
    const cards: ChildAttendanceCard[] = [];
    
    for (const studentId of context.studentIds) {
      // 1. Resolve student name
      const student = await this.prisma.student.findFirst({
        where: { id: studentId, tenantId: context.tenantId },
        include: { membership: { include: { profile: true } } }
      });
      const firstName = student?.membership?.profile?.firstName || 'Student';

      // 2. Fetch today's status
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayRecord = await this.prisma.attendance.findFirst({
        where: { tenantId: context.tenantId, studentId, date: { gte: today } },
        orderBy: { date: 'desc' }
      });

      // 3. Calculate basic term stats (all time for now as proxy for term)
      const total = await this.prisma.attendance.count({ where: { tenantId: context.tenantId, studentId } });
      const present = await this.prisma.attendance.count({ where: { tenantId: context.tenantId, studentId, status: 'PRESENT' } });
      const absent = await this.prisma.attendance.count({ where: { tenantId: context.tenantId, studentId, status: 'ABSENT' } });

      const termPercentage = total > 0 ? Math.round((present / total) * 100) : 100;

      cards.push({
        studentId,
        firstName,
        todayStatus: (todayRecord?.status as any) || 'NOT_RECORDED',
        termPercentage,
        recentAbsences: absent,
        generatedAt: new Date(),
        sourceStatus: 'FRESH',
        correlationId,
        classification: 'FAMILY',
        accessibility: {
          attendanceDescription: `${termPercentage}% attendance this term`,
          statusDescription: `Currently ${todayRecord?.status || 'not recorded'} today`
        }
      });
    }

    return cards;
  }
}
