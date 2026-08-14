import { Injectable } from '@nestjs/common';
import { GuardianRepository } from '../repositories/guardian.repository';
import { PrismaService } from '@saas/core-platform';
import { PlatformEventBus } from '@saas/core-platform';
import { GuardianRelationshipType } from '../dto/student.types';

import { IdentityProvisioningService } from '../../identity/services/identity-provisioning.service';
import { ProvisionGuardianDto } from '../dto/student.types';

@Injectable()
export class GuardianService {
  constructor(
    private readonly guardianRepo: GuardianRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: PlatformEventBus,
    private readonly identityService: IdentityProvisioningService
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

  async provisionAndLinkGuardian(tenantId: string, studentId: string, dto: ProvisionGuardianDto) {
    // 0. Verify Student
    const student = await this.prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.tenantId !== tenantId) {
      throw new Error('Student not found or tenant mismatch');
    }

    // 1. Provision Identity
    const membership = await this.identityService.provisionWorkspaceMember({
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      roleName: 'GUARDIAN'
    });

    // 2. Find or create Guardian canonical record
    let guardian = await this.guardianRepo.findByMembershipId(membership.id, tenantId);
    if (!guardian) {
      guardian = await this.guardianRepo.create({
        tenant: { connect: { id: tenantId } },
        membership: { connect: { id: membership.id } }
      });
    }

    // 3. Link Guardian to Student
    const existingLink = await this.prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId: guardian.id
        }
      }
    });

    let link = existingLink;
    if (!existingLink) {
      link = await this.prisma.studentGuardian.create({
        data: {
          studentId,
          guardianId: guardian.id,
          relationship: dto.relationshipType as any,
        }
      });

      await this.eventBus.publish('Student.GuardianLinked', {
        tenantId,
        studentId,
        guardianId: guardian.id,
        relationshipType: dto.relationshipType
      });
    }

    return { guardian, link };
  }
}
