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

  async linkGuardian(tenantId: string, studentId: string, guardianId: string, relationshipType: GuardianRelationshipType) {
    const link = await this.prisma.studentGuardian.create({
      data: {
        studentId,
        guardianId,
        relationship: relationshipType as any, // Cast since GuardianRelationshipType doesn't exactly match Prisma Enum yet unless aligned
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
