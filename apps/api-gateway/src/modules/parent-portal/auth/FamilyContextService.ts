import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '../../../../packages/core-platform/prisma/generated/client';
import { FamilyContext } from './FamilyContext';

@Injectable()
export class FamilyContextService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves the FamilyContext for an authenticated User.
   * This is the absolute security boundary for the Parent Portal.
   */
  async resolveFamilyContext(userId: string, tenantId: string): Promise<FamilyContext> {
    // 1. Find the User's TenantMembership
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: {
        Guardian: {
          include: {
            students: {
              select: { studentId: true } // We only need the IDs to establish the security boundary
            }
          }
        },
        role: {
          include: { permissions: { include: { permission: true } } }
        }
      }
    });

    if (!membership) {
      throw new UnauthorizedException('User does not belong to this tenant.');
    }

    // 2. Ensure they actually have a Guardian Profile
    if (!membership.Guardian) {
      throw new UnauthorizedException('User is not registered as a Guardian in this tenant.');
    }

    // 3. Extract permissions
    const permissions = membership.role.permissions.map(rp => rp.permission.name);

    // 4. Determine Active Academic Session (usually configured at Tenant level, using a placeholder logic here)
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true }
    });

    // 5. Construct Context
    const familyContext: FamilyContext = {
      tenantId,
      userId,
      guardianId: membership.Guardian.id,
      studentIds: membership.Guardian.students.map(sg => sg.studentId),
      permissions,
      activeAcademicSessionId: activeYear?.id,
      featureFlags: {} // Can be populated from Tenant feature flags
    };

    return familyContext;
  }
}
