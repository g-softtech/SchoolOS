import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FamilyContextService } from './FamilyContextService';

@Injectable()
export class FamilyContextGuard implements CanActivate {
  constructor(private readonly familyContextService: FamilyContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // In a real NestJS app, user and tenantId would be extracted from the JWT token via standard AuthGuards.
    // Assuming request.user exists from a prior JwtAuthGuard:
    const userId = request.user?.id;
    const tenantId = request.headers['x-tenant-id'] || request.user?.tenantId;

    if (!userId || !tenantId) {
      throw new UnauthorizedException('Missing authentication context.');
    }

    try {
      // Resolve and inject the FamilyContext into the request object
      request.familyContext = await this.familyContextService.resolveFamilyContext(userId, tenantId);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Failed to resolve Family Context: ' + error.message);
    }
  }
}
