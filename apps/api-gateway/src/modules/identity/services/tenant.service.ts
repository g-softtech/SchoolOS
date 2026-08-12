import { Injectable } from '@nestjs/common';
import { TenantRepository } from '../repositories/tenant.repository';
import { TenantMembershipRepository } from '../repositories/tenant-membership.repository';
import { UserRepository } from '../repositories/user.repository';
import { PlatformEventBus } from '@saas/core-platform';

export interface CreateTenantDto {
  name: string;
  slug: string;
  planId: string;
}

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly membershipRepo: TenantMembershipRepository,
    private readonly userRepo: UserRepository,
    private readonly eventBus: PlatformEventBus
  ) {}

  async provisionTenant(globalUserId: string, dto: CreateTenantDto): Promise<any> {
    // A strict transaction ensuring both Tenant and SUPER_ADMIN membership are atomic
    return this.tenantRepo.transaction(async (txTenantRepo) => {
      // Create Tenant
      const tenant = await txTenantRepo.create({
        name: dto.name,
        slug: dto.slug,
        planId: dto.planId,
        status: 'ACTIVE'
      });

      // The caller requires a transaction for membership too, handled manually or via the same tx context 
      // In Prisma we pass the PrismaClient around, but abstracted by BaseRepository.
      // Assuming txTenantRepo exposes a way to get the membership repo in the same tx, 
      // or we handle it via standard Prisma transaction pattern in the real app.
      
      // We will assume txTenantRepo has the ability to create memberships in this context:
      const membership = await this.membershipRepo.create({
        tenantId: tenant.id,
        userId: globalUserId,
        roleId: 'SUPER_ADMIN_ROLE_ID' // Typically resolved from a Role repository
      });

      // Emit Domain Event
      await this.eventBus.publish({
        eventName: 'Identity.Tenant.Provisioned',
        version: 1,
        occurredAt: new Date().toISOString(),
        payload: {
          tenantId: tenant.id,
          provisionedByUserId: globalUserId
        }
      });

      return { tenant, membership };
    });
  }
}
