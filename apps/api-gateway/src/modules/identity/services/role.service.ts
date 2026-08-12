import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../repositories/role.repository';
import { PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly eventBus: PlatformEventBus
  ) {}

  async updateRole(roleId: string, tenantId: string, updates: any): Promise<void> {
    const role = await this.roleRepo.findById(roleId, tenantId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.roleRepo.update(roleId, tenantId, updates);

    // Cache Invalidation Event
    await this.eventBus.publish({
      eventName: 'Identity.Role.Updated',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { roleId, tenantId }
    });
  }
}
