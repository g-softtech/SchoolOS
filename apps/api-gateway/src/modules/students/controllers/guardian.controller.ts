import { Controller, Post, Param, Body } from '@nestjs/common';
import { GuardianService } from '../services/guardian.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { GuardianRelationshipType, ProvisionGuardianDto } from '../dto/student.types';

@Controller('api/v1/students')
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Post(':studentId/guardians')
  @RequirePermission('students.guardians.manage')
  async linkGuardian(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
    @Body() body: ProvisionGuardianDto | { guardianId: string, relationshipType: GuardianRelationshipType }
  ) {
    if ('guardianId' in body && body.guardianId) {
      return this.guardianService.linkGuardian(
        ctx.tenantId,
        studentId,
        body.guardianId,
        body.relationshipType
      );
    } else {
      const provisionDto = body as ProvisionGuardianDto;
      return this.guardianService.provisionAndLinkGuardian(
        ctx.tenantId,
        studentId,
        provisionDto
      );
    }
  }
}
