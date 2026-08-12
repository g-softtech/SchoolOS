import { Module } from '@nestjs/common';
import { TimetablesController } from './timetables.controller';
import { TimetablesService } from './timetables.service';
import { PrismaModule } from '@saas/core-platform';

@Module({
  imports: [PrismaModule],
  controllers: [TimetablesController],
  providers: [TimetablesService],
  exports: [TimetablesService],
})
export class TimetablesModule {}
