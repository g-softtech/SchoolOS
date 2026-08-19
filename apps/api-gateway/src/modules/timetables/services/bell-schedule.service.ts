import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BellScheduleRepository } from '../repositories/bell-schedule.repository';
import { CreateBellScheduleDto, UpdateBellScheduleDto } from '../dto/bell-schedule.dto';
import { PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class BellScheduleService {
  constructor(
    private readonly bellScheduleRepo: BellScheduleRepository,
    private readonly eventBus: PlatformEventBus,
  ) {}

  private validatePeriods(periods: any[]) {
    if (!periods || periods.length === 0) {
      throw new BadRequestException('A bell schedule must have at least one period');
    }

    // Basic time format validation (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    
    for (const period of periods) {
      if (!timeRegex.test(period.startTime) || !timeRegex.test(period.endTime)) {
        throw new BadRequestException(`Invalid time format for period ${period.name}. Use HH:mm`);
      }
      
      // Compare times
      const start = new Date(`1970-01-01T${period.startTime}:00Z`).getTime();
      const end = new Date(`1970-01-01T${period.endTime}:00Z`).getTime();
      
      if (start >= end) {
        throw new BadRequestException(`Period ${period.name} start time must be before end time`);
      }
    }
    
    // Check for overlapping periods
    const sortedPeriods = [...periods].sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );

    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      if (sortedPeriods[i].endTime > sortedPeriods[i + 1].startTime) {
        throw new BadRequestException(
          `Periods cannot overlap. ${sortedPeriods[i].name} overlaps with ${sortedPeriods[i + 1].name}`
        );
      }
    }
  }

  async create(tenantId: string, dto: CreateBellScheduleDto) {
    this.validatePeriods(dto.periods);

    const schedule = await this.bellScheduleRepo.create({
      tenantId,
      name: dto.name,
      periods: dto.periods as any,
    });

    await this.eventBus.publish('BellSchedule.Created', {
      tenantId,
      bellScheduleId: schedule.id,
    });

    return schedule;
  }

  async findAll(tenantId: string) {
    return this.bellScheduleRepo.findMany(tenantId);
  }

  async findOne(id: string, tenantId: string) {
    const schedule = await this.bellScheduleRepo.findById(id, tenantId);
    if (!schedule) {
      throw new NotFoundException('Bell schedule not found');
    }
    return schedule;
  }

  async update(id: string, tenantId: string, dto: UpdateBellScheduleDto) {
    // Ensure exists
    await this.findOne(id, tenantId);

    this.validatePeriods(dto.periods);

    const schedule = await this.bellScheduleRepo.update(id, tenantId, {
      name: dto.name,
      periods: dto.periods as any,
    });

    await this.eventBus.publish('BellSchedule.Updated', {
      tenantId,
      bellScheduleId: schedule.id,
    });

    return schedule;
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    
    await this.bellScheduleRepo.delete(id, tenantId);
    
    await this.eventBus.publish('BellSchedule.Deleted', {
      tenantId,
      bellScheduleId: id,
    });
  }
}
