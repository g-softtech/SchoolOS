import { Controller, Post, Param, Body } from '@nestjs/common';
import { GuardianService } from '../services/guardian.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { GuardianRelationshipType } from '../dto/student.types';

@Controller('api/v1/students')
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Post(':studentId/guardians')
  @RequirePermission('students.guardians.manage')
  async linkGuardian(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
    @Body() body: { guardianId: string, relationshipType: GuardianRelationshipType, isPrimary: boolean }
  ) {
    return this.guardianService.linkGuardian(
      ctx.tenantId,
      studentId,
      body.guardianId,
      body.relationshipType,
      body.isPrimary
    );
  }
}
