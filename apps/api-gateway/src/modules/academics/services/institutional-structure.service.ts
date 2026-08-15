import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, PlatformEventBus } from '@saas/core-platform';
import { 
  CreateCampusDto, 
  CreateClassDto, 
  CreateArmDto, 
  CreateSubjectGroupDto, 
  CreateSubjectDto 
} from '../dto/institutional-structure.dto';
import { Campus, Class, Arm, SubjectGroup, Subject } from '@saas/core-platform';

@Injectable()
export class InstitutionalStructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: PlatformEventBus
  ) {}

  // ==========================================
  // Campuses
  // ==========================================
  async createCampus(tenantId: string, dto: CreateCampusDto): Promise<Campus> {
    return this.prisma.campus.create({
      data: {
        tenantId,
        ...dto
      }
    });
  }

  async getCampuses(tenantId: string): Promise<Campus[]> {
    return this.prisma.campus.findMany({ where: { tenantId } });
  }

  // ==========================================
  // Classes
  // ==========================================
  async createClass(tenantId: string, dto: CreateClassDto): Promise<Class> {
    return this.prisma.class.create({
      data: {
        tenantId,
        ...dto
      }
    });
  }

  async getClasses(tenantId: string): Promise<Class[]> {
    return this.prisma.class.findMany({ 
      where: { tenantId },
      orderBy: { level: 'asc' },
      include: { arms: true }
    });
  }

  // ==========================================
  // Arms
  // ==========================================
  async createArm(tenantId: string, dto: CreateArmDto): Promise<Arm> {
    // Validate class belongs to tenant
    const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
    if (!cls || cls.tenantId !== tenantId) {
      throw new NotFoundException('Class not found');
    }

    // Validate unique arm name within class
    const existingArm = await this.prisma.arm.findUnique({
      where: {
        classId_name: {
          classId: dto.classId,
          name: dto.name
        }
      }
    });

    if (existingArm) {
      throw new ConflictException(`Arm ${dto.name} already exists for this class`);
    }

    return this.prisma.arm.create({
      data: {
        tenantId,
        ...dto
      }
    });
  }

  // ==========================================
  // Subjects
  // ==========================================
  async createSubjectGroup(tenantId: string, dto: CreateSubjectGroupDto): Promise<SubjectGroup> {
    return this.prisma.subjectGroup.create({
      data: {
        tenantId,
        ...dto
      }
    });
  }

  async getSubjectGroups(tenantId: string): Promise<SubjectGroup[]> {
    return this.prisma.subjectGroup.findMany({ where: { tenantId } });
  }

  async createSubject(tenantId: string, dto: CreateSubjectDto): Promise<Subject> {
    // If subjectGroupId provided, ensure it belongs to tenant
    if (dto.subjectGroupId) {
      const group = await this.prisma.subjectGroup.findUnique({
        where: { id: dto.subjectGroupId }
      });
      if (!group || group.tenantId !== tenantId) {
        throw new NotFoundException('Subject group not found');
      }
    }

    // Ensure subject code is unique per tenant
    const existing = await this.prisma.subject.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: dto.code
        }
      }
    });

    if (existing) {
      throw new ConflictException(`Subject with code ${dto.code} already exists`);
    }

    return this.prisma.subject.create({
      data: {
        tenantId,
        ...dto
      }
    });
  }

  async getSubjects(tenantId: string): Promise<Subject[]> {
    return this.prisma.subject.findMany({ 
      where: { tenantId },
      include: { subjectGroup: true }
    });
  }

  // ==========================================
  // Class <-> Subject Mapping
  // ==========================================
  async mapClassSubjects(tenantId: string, classId: string, subjectIds: string[]): Promise<Class> {
    // 1. Verify Class belongs to tenant
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.tenantId !== tenantId) {
      throw new NotFoundException('Class not found');
    }

    // 2. Verify all Subjects belong to tenant
    const subjects = await this.prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        tenantId
      }
    });

    if (subjects.length !== subjectIds.length) {
      throw new BadRequestException('One or more subjects do not exist or belong to another tenant');
    }

    // 3. Update the M:N relationship (overwrite existing)
    return this.prisma.class.update({
      where: { id: classId },
      data: {
        subjects: {
          set: subjectIds.map(id => ({ id }))
        }
      },
      include: {
        subjects: true
      }
    });
  }
}
