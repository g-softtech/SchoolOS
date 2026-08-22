import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ExamService } from '../services/exam.service';
import { CreateExamDto } from '../dto/exam.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator';

@Controller('api/v1/exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @RequirePermission('exam.manage')
  async createExam(
    @CurrentWorkspace() workspace: any,
    @Body() dto: CreateExamDto
  ) {
    const tenantId = workspace.tenantId || (workspace as any).tenant?.id;
    return this.examService.createExam(
      tenantId,
      dto.termId,
      dto.subjectId,
      dto.title,
      dto.totalMarks,
      dto.isCBT,
      new Date(dto.date)
    );
  }

  @Get()
  @RequirePermission('exam.view')
  async getExams(@CurrentWorkspace() workspace: any) {
    const tenantId = workspace.tenantId || (workspace as any).tenant?.id;
    return this.examService.getExams(tenantId);
  }

  @Get(':id')
  @RequirePermission('exam.view')
  async getExamById(
    @CurrentWorkspace() workspace: any,
    @Param('id') id: string
  ) {
    const tenantId = workspace.tenantId || (workspace as any).tenant?.id;
    return this.examService.getExamById(tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('exam.manage')
  async deleteExam(
    @CurrentWorkspace() workspace: any,
    @Param('id') id: string
  ) {
    const tenantId = workspace.tenantId || (workspace as any).tenant?.id;
    return this.examService.deleteExam(tenantId, id);
  }
}
