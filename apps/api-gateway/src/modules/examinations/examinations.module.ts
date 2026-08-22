import { Module } from '@nestjs/common';
import { ExamService } from './services/exam.service';
import { ResultService } from './services/result.service';
import { ExamController } from './controllers/exam.controller';
import { ResultController } from './controllers/result.controller';
import { PrismaModule } from '@saas/core-platform';

@Module({
  imports: [PrismaModule],
  controllers: [ExamController, ResultController],
  providers: [ExamService, ResultService],
  exports: [ExamService, ResultService],
})
export class ExaminationsModule {}
