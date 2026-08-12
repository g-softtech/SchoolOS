import { Module } from '@nestjs/common';
import { AcademicsController } from './academics.controller';
import { AcademicsService } from './academics.service';
import { PrismaModule } from '@saas/core-platform';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicsController],
  providers: [AcademicsService],
  exports: [AcademicsService],
})
export class AcademicsModule {}
