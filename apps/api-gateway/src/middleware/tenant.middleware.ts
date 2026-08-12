import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContextStorage } from '@saas/core-platform';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    // Zero Trust Boundary
    if (!tenantId) {
      throw new ForbiddenException('Missing x-tenant-id header');
    }

    // Provision the identity into the execution context
    tenantContextStorage.run({ tenantId }, () => {
      next();
    });
  }
}
