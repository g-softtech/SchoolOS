import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma, Timetable } from '@saas/core-platform';

@Injectable()
export class TimetableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TimetableUncheckedCreateInput): Promise<Timetable> {
    return this.prisma.timetable.create({ data });
  }

  async findByArmAndTerm(tenantId: string, armId: string, termId: string): Promise<Timetable | null> {
    return this.prisma.timetable.findFirst({
      where: { tenantId, armId, termId },
    });
  }

  async findByIdWithSlots(id: string, tenantId: string) {
    return this.prisma.timetable.findFirst({
      where: { id, tenantId },
      include: {
        TimetableSlot: true,
      },
    });
  }

  async findById(id: string, tenantId: string) {
    return this.prisma.timetable.findFirst({
      where: { id, tenantId },
    });
  }

  async getArmDetails(armId: string, tenantId: string) {
    return this.prisma.arm.findFirst({
      where: { id: armId, tenantId },
      include: {
        class: true,
      },
    });
  }

  async getTerm(termId: string, tenantId: string) {
    return this.prisma.term.findFirst({
      where: { id: termId, tenantId },
    });
  }

  async getSubjects(subjectIds: string[], tenantId: string) {
    return this.prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        tenantId,
      },
    });
  }

  async replaceSlotsTransactionally(
    timetableId: string,
    slots: Prisma.TimetableSlotUncheckedCreateInput[]
  ) {
    const ops: any[] = [
      this.prisma.timetableSlot.deleteMany({
        where: { timetableId },
      })
    ];

    if (slots.length > 0) {
      ops.push(
        this.prisma.timetableSlot.createMany({
          data: slots,
        })
      );
    }

    await this.prisma.$transaction(ops);

    return this.prisma.timetableSlot.findMany({
      where: { timetableId },
    });
  }
}
