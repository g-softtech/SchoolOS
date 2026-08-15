import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, PlatformEventBus } from '@saas/core-platform';
import { CreateAcademicYearDto, CreateTermDto } from '../dto/academic-calendar.dto';
import { AcademicYear, Term } from '@saas/core-platform';

@Injectable()
export class AcademicCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async createAcademicYear(tenantId: string, dto: CreateAcademicYearDto): Promise<AcademicYear> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const year = await this.prisma.academicYear.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: start,
        endDate: end,
        status: 'UPCOMING', // Always starts as upcoming
      }
    });

    return year;
  }

  async getAcademicYears(tenantId: string): Promise<AcademicYear[]> {
    return this.prisma.academicYear.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' }
    });
  }

  /**
   * Activates a specific academic year and automatically marks the previously
   * active year as PAST. This is an atomic transaction.
   */
  async activateAcademicYear(tenantId: string, academicYearId: string): Promise<AcademicYear> {
    return this.prisma.$transaction(async (tx) => {
      const yearToActivate = await tx.academicYear.findUnique({
        where: { id: academicYearId }
      });

      if (!yearToActivate || yearToActivate.tenantId !== tenantId) {
        throw new NotFoundException('Academic year not found');
      }

      if (yearToActivate.status === 'ACTIVE') {
        return yearToActivate;
      }

      // Mark current active year(s) as PAST
      await tx.academicYear.updateMany({
        where: { 
          tenantId, 
          status: 'ACTIVE' 
        },
        data: { 
          status: 'PAST' 
        }
      });

      // Mark the selected year as ACTIVE
      const activeYear = await tx.academicYear.update({
        where: { id: academicYearId },
        data: { status: 'ACTIVE' }
      });

      // Emit event using the global event bus
      await this.eventBus.publish('AcademicYear.Activated', {
        tenantId,
        academicYearId,
        name: activeYear.name
      });

      return activeYear;
    });
  }

  async createTerm(tenantId: string, dto: CreateTermDto): Promise<Term> {
    // Verify the academic year belongs to this tenant
    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId }
    });

    if (!year || year.tenantId !== tenantId) {
      throw new NotFoundException('Academic year not found');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start >= end) {
      throw new BadRequestException('Term start date must be before end date');
    }

    if (start < year.startDate || end > year.endDate) {
      throw new BadRequestException('Term dates must fall within the academic year dates');
    }

    const term = await this.prisma.term.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        name: dto.name,
        startDate: start,
        endDate: end,
      }
    });

    return term;
  }

  async getTermsByYear(tenantId: string, academicYearId: string): Promise<Term[]> {
    return this.prisma.term.findMany({
      where: { 
        tenantId,
        academicYearId
      },
      orderBy: { startDate: 'asc' }
    });
  }
}
