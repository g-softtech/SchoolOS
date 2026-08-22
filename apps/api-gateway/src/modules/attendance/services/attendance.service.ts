import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, AttendanceStatus } from '@saas/core-platform';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records daily attendance for students on a specific date.
   */
  async recordDailyAttendance(
    tenantId: string, 
    armId: string, 
    date: Date, 
    records: { studentId: string, status: AttendanceStatus, remarks?: string }[]
  ) {
    // 1. Verify the Arm belongs to the tenant
    const arm = await this.prisma.arm.findFirst({
      where: { id: armId, tenantId },
    });
    if (!arm) {
      throw new NotFoundException('Arm not found');
    }

    if (records.length === 0) {
      return [];
    }

    // 2. Verify all students belong to the tenant
    const studentIds = records.map(r => r.studentId);
    const validStudents = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        tenantId,
      }
    });

    if (validStudents.length !== studentIds.length) {
      throw new BadRequestException('One or more students are invalid or do not belong to this tenant.');
    }

    // 3. Upsert attendance records
    // Start transaction since we might be updating many records
    const upserts = records.map(record => 
      this.prisma.attendance.upsert({
        where: {
          tenantId_studentId_date: {
            tenantId,
            studentId: record.studentId,
            date,
          }
        },
        update: {
          status: record.status,
          remarks: record.remarks,
          armId, 
        },
        create: {
          tenantId,
          studentId: record.studentId,
          armId,
          date,
          status: record.status,
          remarks: record.remarks,
        }
      })
    );

    const results = await this.prisma.$transaction(upserts);
    this.logger.log(`Recorded daily attendance for ${results.length} students in Arm ${armId} on ${date}`);
    return results;
  }

  /**
   * Retrieves daily attendance for a specific Arm and Date.
   */
  async getAttendanceByArmAndDate(tenantId: string, armId: string, date: Date) {
    return this.prisma.attendance.findMany({
      where: {
        tenantId,
        armId,
        date,
      },
      include: {
        student: {
          include: {
            membership: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        student: {
          membership: {
            profile: {
              firstName: 'asc'
            }
          }
        }
      }
    });
  }
}
