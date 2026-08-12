import { Injectable } from '@nestjs/common';
import { GuardianRepository } from '../repositories/guardian.repository';
import { PrismaService } from '@saas/core-platform';
import { PlatformEventBus } from '@saas/core-platform';
import { GuardianRelationshipType } from '../dto/student.types';

@Injectable()
export class GuardianService {
  constructor(
    private readonly guardianRepo: GuardianRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async linkGuardian(tenantId: string, studentId: string, guardianId: string, relationshipType: GuardianRelationshipType, isPrimary: boolean = false) {
    const link = await this.prisma.studentGuardian.create({
      data: {
        studentId,
        guardianId,
        relationship: relationshipType,
        isPrimary
      }
    });

    await this.eventBus.publish('Student.GuardianLinked', {
      tenantId,
      studentId,
      guardianId,
      relationshipType
    });

    return link;
  }
}
