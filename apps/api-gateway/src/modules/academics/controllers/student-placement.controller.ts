import { Controller, Post, Param, Body } from '@nestjs/common';
import { StudentPlacementService } from '../services/student-placement.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';
import { WorkspaceContext } from '@saas/core-platform';
import { PlaceStudentDto } from '../dto/student-placement.dto';

@Controller('api/v1/academics/students')
export class StudentPlacementController {
  constructor(private readonly placementService: StudentPlacementService) {}

  @Post(':studentId/placement')
  @RequirePermission('academics.manage')
  async placeStudent(
    @CurrentWorkspace() ctx: WorkspaceContext,
    @Param('studentId') studentId: string,
    @Body() dto: PlaceStudentDto
  ) {
    return this.placementService.placeStudentInArm(ctx.tenantId, studentId, dto);
  }
}
