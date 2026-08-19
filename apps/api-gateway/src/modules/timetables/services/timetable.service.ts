import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TimetableRepository } from '../repositories/timetable.repository';
import { BellScheduleRepository } from '../repositories/bell-schedule.repository';
import { CreateTimetableDto, BulkUpdateSlotsDto } from '../dto/timetable.dto';
import { PlatformEventBus } from '@saas/core-platform';
import { TIMETABLE_UNASSIGNED_TEACHER } from '../timetables.constants';

@Injectable()
export class TimetableService {
  constructor(
    private readonly timetableRepo: TimetableRepository,
    private readonly bellScheduleRepo: BellScheduleRepository,
    private readonly eventBus: PlatformEventBus,
  ) {}

  async create(tenantId: string, dto: CreateTimetableDto) {
    // 1. Verify Arm
    const arm = await this.timetableRepo.getArmDetails(dto.armId, tenantId);
    if (!arm) throw new NotFoundException('Arm not found');

    // 2. Verify Term
    const term = await this.timetableRepo.getTerm(dto.termId, tenantId);
    if (!term) throw new NotFoundException('Term not found');

    // 3. Verify BellSchedule
    const bellSchedule = await this.bellScheduleRepo.findById(dto.bellScheduleId, tenantId);
    if (!bellSchedule) throw new NotFoundException('Bell Schedule not found');

    // 4. Check for duplicate Timetable (Arm + Term)
    const existing = await this.timetableRepo.findByArmAndTerm(tenantId, dto.armId, dto.termId);
    if (existing) {
      throw new ConflictException('A timetable already exists for this Arm and Term');
    }

    // 5. Create Timetable
    const timetable = await this.timetableRepo.create({
      tenantId,
      armId: dto.armId,
      termId: dto.termId,
      config: {
        bellScheduleId: dto.bellScheduleId,
      },
    });

    await this.eventBus.publish('Timetable.Created', {
      tenantId,
      timetableId: timetable.id,
      armId: dto.armId,
      termId: dto.termId,
    });

    return timetable;
  }

  async findOneWithSlots(id: string, tenantId: string) {
    const timetable = await this.timetableRepo.findByIdWithSlots(id, tenantId);
    if (!timetable) throw new NotFoundException('Timetable not found');
    return timetable;
  }

  async findByArmAndTermWithSlots(armId: string, termId: string, tenantId: string) {
    const timetable = await this.timetableRepo.findByArmAndTerm(tenantId, armId, termId);
    if (!timetable) throw new NotFoundException('Timetable not found for the specified Arm and Term');
    return this.findOneWithSlots(timetable.id, tenantId);
  }

  async bulkUpdateSlots(id: string, tenantId: string, dto: BulkUpdateSlotsDto) {
    // 1. Get Timetable and Arm/Class relationship
    const timetable = await this.timetableRepo.findById(id, tenantId);
    if (!timetable) throw new NotFoundException('Timetable not found');

    const arm = await this.timetableRepo.getArmDetails(timetable.armId, tenantId);
    if (!arm) throw new NotFoundException('Arm not found (inconsistent data)');
    const classId = arm.classId;

    // 2. Validate Bell Schedule
    const config = timetable.config as any;
    if (!config || !config.bellScheduleId) {
      throw new BadRequestException('Timetable config missing bellScheduleId');
    }
    const bellSchedule = await this.bellScheduleRepo.findById(config.bellScheduleId, tenantId);
    if (!bellSchedule) throw new NotFoundException('Referenced Bell Schedule not found');
    const validPeriodIds = new Set((bellSchedule.periods as any[]).map(p => p.id));

    // 3. Validate Subjects & Periods
    if (dto.slots.length > 0) {
      const subjectIds = Array.from(new Set(dto.slots.map(s => s.subjectId)));
      const foundSubjects = await this.timetableRepo.getSubjects(subjectIds, tenantId);
      if (foundSubjects.length !== subjectIds.length) {
        throw new NotFoundException('One or more subjects not found');
      }

      // Check for overlapping/duplicate slots in the request and valid period IDs
      const slotMap = new Set<string>();
      for (const slot of dto.slots) {
        if (!validPeriodIds.has(slot.periodId)) {
          throw new BadRequestException(`Period ID ${slot.periodId} does not exist in the Bell Schedule`);
        }
        
        const key = `${slot.dayOfWeek}-${slot.periodId}`;
        if (slotMap.has(key)) {
          throw new ConflictException(`Duplicate slot detected for Day ${slot.dayOfWeek}, Period ${slot.periodId}`);
        }
        slotMap.add(key);
      }
    }

    // 4. Map DTO to Prisma Schema Input
    const newSlots = dto.slots.map(slot => ({
      timetableId: timetable.id,
      dayOfWeek: slot.dayOfWeek,
      periodId: slot.periodId,
      subjectId: slot.subjectId,
      teacherId: TIMETABLE_UNASSIGNED_TEACHER, // Phase 11 Sentinel
      classId, // Derived safely from the server side
    }));

    // 5. Replace slots in transaction
    const updatedSlots = await this.timetableRepo.replaceSlotsTransactionally(timetable.id, newSlots);

    await this.eventBus.publish('Timetable.Slots.Updated', {
      tenantId,
      timetableId: timetable.id,
      slotsCount: updatedSlots.length,
    });

    return updatedSlots;
  }
}
