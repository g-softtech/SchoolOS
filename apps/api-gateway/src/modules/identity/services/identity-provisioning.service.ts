import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, TenantMembership } from '@saas/core-platform';

export interface ProvisionMemberDto {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  dateOfBirth?: Date;
}

@Injectable()
export class IdentityProvisioningService {
  private readonly logger = new Logger(IdentityProvisioningService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  /**
   * Idempotent method to provision a user and workspace membership.
   * If a user with the given email exists, it ensures the tenant membership is created.
   * Uses a single transaction to ensure consistency within the Identity domain.
   */
  async provisionWorkspaceMember(dto: ProvisionMemberDto): Promise<TenantMembership> {
    // Check if membership already exists across the tenant (idempotency check)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          where: { tenantId: dto.tenantId }
        }
      }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      this.logger.log(`Membership already exists for email: ${dto.email} in tenant: ${dto.tenantId}`);
      return existingUser.memberships[0];
    }

    // Resolve the role for the tenant
    let role = await this.prisma.role.findFirst({
      where: { tenantId: dto.tenantId, name: dto.roleName }
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: {
          tenantId: dto.tenantId,
          name: dto.roleName
        }
      });
    }

    // Atomically create User (if not exists), Profile, and Membership
    return this.prisma.$transaction(async (tx) => {
      let userId = existingUser?.id;

      if (!userId) {
        // Create new user
        const newUser = await tx.user.create({
          data: {
            email: dto.email,
            globalRole: 'USER'
          }
        });
        userId = newUser.id;
      }

      // Create membership and profile
      const membership = await tx.tenantMembership.create({
        data: {
          tenantId: dto.tenantId,
          userId: userId,
          roleId: role.id,
          state: 'ACTIVE',
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              dob: dto.dateOfBirth
            }
          }
        }
      });

      return membership;
    });
  }
}
