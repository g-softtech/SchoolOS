import { Controller, Get, Param } from '@nestjs/common';
import { ResultService } from '../services/result.service';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';

@Controller('api/v1/students/:studentId/results')
export class StudentResultController {
  constructor(private readonly resultService: ResultService) {}

  @Get()
  @RequirePermission('exam.view')
  async getStudentResults(
    @CurrentWorkspace() workspace: any,
    @Param('studentId') studentId: string
  ) {
    const tenantId = workspace.tenantId || (workspace as any).tenant?.id;
    return this.resultService.getRecentResultsForStudent(tenantId, studentId);
  }
}
