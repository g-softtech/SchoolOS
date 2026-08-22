import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, NotificationChannel } from '@saas/core-platform';
import { AttendanceService } from './attendance.service';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * Helper to determine start and end of "today" based on tenant's timezone.
   */
  private async getTenantTodayBounds(tenantId: string): Promise<{ startOfDay: Date, endOfDay: Date }> {
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true }
    });
    
    // Safest fallback is UTC if timezone isn't set or TenantSettings doesn't exist
    const tz = tenantSettings?.timezone || 'UTC';
    
    // Native way to get the start/end of the day in a specific timezone
    const now = new Date();
    
    // Format to YYYY-MM-DD in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    // Create a date string representing midnight in that timezone
    const tzDateStr = `${year}-${month}-${day}T00:00:00`;
    
    // Convert back to UTC time
    // We append the timezone offset manually if we must, but since we don't have the offset easily, 
    // it's simpler to parse the string with Intl or use UTC boundaries if we can't accurately parse it.
    // For Node 18+, we can use `toLocaleString` hack to get the offset, but since this is complex:
    // A reliable way is to iterate hours or simply treat start/end of day using UTC for now if timezone is tricky,
    // BUT the user explicitly asked to use tenant timezone. 
    // Let's use a simpler native offset technique:
    
    // This creates a Date object that is midnight UTC, then we shift it by the timezone offset.
    // However, the easiest bulletproof way without moment is standardizing the date string to UTC 
    // and using it as a reference for comparison, or just installing date-fns-tz.
    
    // Since I can't easily install a package without checking if it builds, I will use a basic UTC fallback for the `tz` offset parsing.
    
    let startOfDay = new Date();
    let endOfDay = new Date();
    
    try {
        const d = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        startOfDay = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
        endOfDay = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
        
        // Compute the actual offset difference to correctly map back to true UTC
        const diff = now.getTime() - d.getTime();
        startOfDay = new Date(startOfDay.getTime() + diff);
        endOfDay = new Date(endOfDay.getTime() + diff);
    } catch(e) {
        // Fallback to UTC
        startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    }
    
    return { startOfDay, endOfDay };
  }

  /**
   * Helper to resolve the best Guardian contact for a student.
   * Returns { channel: NotificationChannel, contact: string, guardianName: string } or null
   */
  private async resolveGuardianContact(studentId: string): Promise<{ channel: NotificationChannel, userId: string } | null> {
    const studentGuardians = await this.prisma.studentGuardian.findMany({
      where: { studentId },
      include: {
        guardian: {
          include: {
            membership: {
              include: {
                profile: true,
                user: true,
              }
            }
          }
        }
      }
    });

    if (studentGuardians.length === 0) return null;

    // Prefer guardian with a phone number for SMS
    for (const sg of studentGuardians) {
      const profile = sg.guardian?.membership?.profile;
      const user = sg.guardian?.membership?.user;
      
      if (profile?.phone) {
        return { channel: NotificationChannel.SMS, userId: user.id };
      }
    }

    // Fallback to email
    for (const sg of studentGuardians) {
      const user = sg.guardian?.membership?.user;
      if (user?.email) {
        return { channel: NotificationChannel.EMAIL, userId: user.id };
      }
    }

    return null;
  }

  /**
   * Process a student Arrival scan.
   */
  async processArrival(tenantId: string, admissionNumber: string, scannedByUserId: string, scanMethod?: string) {
    // 1. Tenant-scoped Student lookup
    const student = await this.prisma.student.findUnique({
      where: {
        tenantId_admissionNumber: {
          tenantId,
          admissionNumber,
        }
      },
      include: {
        membership: {
          include: { profile: true }
        }
      }
    });

    if (!student) {
      throw new NotFoundException('Student not found or invalid for this school.');
    }

    if (student.membership?.state !== 'ACTIVE') {
      throw new BadRequestException('Student is not active/enrolled.');
    }

    if (!student.currentArmId) {
      throw new BadRequestException('Student is not assigned to any class/arm.');
    }

    // 2. Check Idempotency based on tenant timezone
    const { startOfDay, endOfDay } = await this.getTenantTodayBounds(tenantId);
    
    const existingArrival = await this.prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'STUDENT_ARRIVED',
        entityId: student.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    });

    if (existingArrival) {
      return {
        status: 'already_checked_in',
        event: 'STUDENT_ARRIVED',
        message: 'Student has already been scanned for arrival today.',
        timestamp: existingArrival.createdAt,
        student: {
          id: student.id,
          name: `${student.membership.profile?.firstName} ${student.membership.profile?.lastName}`,
          admissionNumber: student.admissionNumber
        }
      };
    }

    // 3. Resolve Guardian Contacts
    const guardianContact = await this.resolveGuardianContact(student.id);

    const now = new Date();
    const studentName = `${student.membership.profile?.firstName} ${student.membership.profile?.lastName}`;

    // 4. Transactionally execute AuditLog, Attendance, and NotificationQueue
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create AuditLog
      const auditLog = await prisma.auditLog.create({
        data: {
          tenantId,
          userId: scannedByUserId,
          action: 'STUDENT_ARRIVED',
          entity: 'Student',
          entityId: student.id,
          metadata: {
            method: scanMethod || 'SCAN',
            admissionNumber
          }
        }
      });

      // Upsert Attendance to PRESENT
      await prisma.attendance.upsert({
        where: {
          tenantId_studentId_date: {
            tenantId,
            studentId: student.id,
            date: startOfDay, // Normalize date to start of tenant's day
          }
        },
        update: {
          status: 'PRESENT',
          armId: student.currentArmId,
        },
        create: {
          tenantId,
          studentId: student.id,
          armId: student.currentArmId,
          date: startOfDay,
          status: 'PRESENT',
          remarks: 'Arrival Scanned',
        }
      });

      // Enqueue Notification
      let notificationQueued = false;
      if (guardianContact) {
        await prisma.notificationQueue.create({
          data: {
            tenantId,
            userId: guardianContact.userId,
            channel: guardianContact.channel,
            status: 'PENDING', // M13.2 limitation: queue only, no delivery yet
            payload: {
              subject: 'Student Arrival',
              body: `${studentName} arrived at school at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}.`
            }
          }
        });
        notificationQueued = true;
      }

      return {
        auditLog,
        notificationQueued,
        channel: guardianContact?.channel
      };
    });

    return {
      status: 'success',
      event: 'STUDENT_ARRIVED',
      timestamp: result.auditLog.createdAt,
      attendanceStatus: 'PRESENT',
      notificationQueued: result.notificationQueued,
      notificationChannel: result.channel,
      student: {
        id: student.id,
        name: studentName,
        admissionNumber: student.admissionNumber
      }
    };
  }

  /**
   * Process a student Pickup scan.
   */
  async processPickup(tenantId: string, admissionNumber: string, scannedByUserId: string, scanMethod?: string) {
    // 1. Tenant-scoped Student lookup
    const student = await this.prisma.student.findUnique({
      where: {
        tenantId_admissionNumber: {
          tenantId,
          admissionNumber,
        }
      },
      include: {
        membership: {
          include: { profile: true }
        }
      }
    });

    if (!student) {
      throw new NotFoundException('Student not found or invalid for this school.');
    }

    if (student.membership?.state !== 'ACTIVE') {
      throw new BadRequestException('Student is not active/enrolled.');
    }

    // 2. Check Idempotency based on tenant timezone
    const { startOfDay, endOfDay } = await this.getTenantTodayBounds(tenantId);
    
    const existingPickup = await this.prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'STUDENT_PICKED_UP',
        entityId: student.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    });

    if (existingPickup) {
      return {
        status: 'already_picked_up',
        event: 'STUDENT_PICKED_UP',
        message: 'Student has already been scanned for pickup today.',
        timestamp: existingPickup.createdAt,
        student: {
          id: student.id,
          name: `${student.membership.profile?.firstName} ${student.membership.profile?.lastName}`,
          admissionNumber: student.admissionNumber
        }
      };
    }

    // 3. Resolve Guardian Contacts
    const guardianContact = await this.resolveGuardianContact(student.id);

    const now = new Date();
    const studentName = `${student.membership.profile?.firstName} ${student.membership.profile?.lastName}`;

    // 4. Transactionally execute AuditLog and NotificationQueue
    // NOTE: Pickup does NOT alter Attendance table
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create AuditLog
      const auditLog = await prisma.auditLog.create({
        data: {
          tenantId,
          userId: scannedByUserId,
          action: 'STUDENT_PICKED_UP',
          entity: 'Student',
          entityId: student.id,
          metadata: {
            method: scanMethod || 'SCAN',
            admissionNumber
          }
        }
      });

      // Enqueue Notification
      let notificationQueued = false;
      if (guardianContact) {
        await prisma.notificationQueue.create({
          data: {
            tenantId,
            userId: guardianContact.userId,
            channel: guardianContact.channel,
            status: 'PENDING', // M13.2 limitation: queue only
            payload: {
              subject: 'Student Pickup',
              body: `${studentName} was picked up from school at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}.`
            }
          }
        });
        notificationQueued = true;
      }

      return {
        auditLog,
        notificationQueued,
        channel: guardianContact?.channel
      };
    });

    return {
      status: 'success',
      event: 'STUDENT_PICKED_UP',
      timestamp: result.auditLog.createdAt,
      notificationQueued: result.notificationQueued,
      notificationChannel: result.channel,
      student: {
        id: student.id,
        name: studentName,
        admissionNumber: student.admissionNumber
      }
    };
  }
}
