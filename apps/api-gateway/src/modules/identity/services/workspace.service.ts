import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { tenantContextStorage } from '@saas/core-platform';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class WorkspaceService {
  constructor(private readonly userRepo: UserRepository) {}

  async getCurrentTenantUsers(): Promise<any[]> {
    // 1. Retrieve the tenant context populated by the Interceptor
    const context = tenantContextStorage.getStore();
    
    if (!context || !context.tenantId) {
      throw new InternalServerErrorException('Workspace context is missing');
    }

    // 2. The controller NEVER passed the tenantId to this method. 
    // The service accesses the context natively, ensuring strict isolation.
    const tenantId = context.tenantId;

    // 3. Perform business logic strictly scoped to the tenant
    return this.userRepo.findManyIncludingDeleted(tenantId, {});
  }
}
