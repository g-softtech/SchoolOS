import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TimetablesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createBellSchedule(tenantId: string, name: string, effectiveFrom?: Date, effectiveTo?: Date) {
    const schedule = await this.prisma.bellSchedule.create({
      data: {
        tenantId,
        name,
        effectiveFrom,
        effectiveTo,
        periods: [],
      } as any,
    });

    this.eventEmitter.emit('Timetable.Config.Created', {
      tenantId,
      bellScheduleId: schedule.id,
    });

    return schedule;
  }

  async assignSlot(
    tenantId: string,
    academicTermId: string,
    bellScheduleId: string,
    teachingDayId: string,
    periodId: string,
    subjectAssignmentId: string,
    roomId?: string,
    teacherId?: string,
  ) {
    const slot = await this.prisma.timetableSlot.create({
      data: {
        tenantId,
        academicTermId,
        bellScheduleId,
        teachingDayId,
        periodId,
        subjectAssignmentId,
        roomId,
        teacherId,
        status: 'DRAFT',
        timetableId: 'default',
        dayOfWeek: 1,
        subjectId: 'default',
        classId: 'default',
      } as any,
    });

    this.eventEmitter.emit('Timetable.Slot.Created', {
      tenantId,
      slotId: slot.id,
    });

    if (teacherId) {
      this.eventEmitter.emit('Timetable.Teacher.Assigned', {
        tenantId,
        slotId: slot.id,
        teacherId,
      });
    }

    return slot;
  }
}
