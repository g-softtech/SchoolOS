import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ResultService } from '../services/result.service';
import { BatchEnterResultsDto } from '../dto/result.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';

@Controller('api/v1/exams/:examId/results')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @Get('eligible')
  @RequirePermission('exam.grade')
  async getEligibleCandidates(
    @CurrentWorkspace() workspace: any,
    @Param('examId') examId: string
  ) {
    const tenantId = workspace.tenantId || (workspace as any).tenant?.id;
    return this.resultService.getEligibleCandidates(tenantId, examId);
  }

  @Post('batch')
  @RequirePermission('exam.grade')
  async batchEnterResults(
    @CurrentWorkspace() workspace: any,
    @Param('examId') examId: string,
    @Body() dto: BatchEnterResultsDto
  ) {
    const tenantId = workspace.tenantId || (workspace as any).tenant?.id;
    return this.resultService.batchEnterResults(tenantId, examId, dto.results);
  }
}
