import { Module } from '@nestjs/common';
import { PrismaModule } from '@saas/core-platform';
import { AttendanceService } from './services/attendance.service';
import { LeaveService } from './services/leave.service';
import { AttendanceController } from './controllers/attendance.controller';
import { LeaveController } from './controllers/leave.controller';

@Module({
  imports: [PrismaModule], 
  controllers: [
    AttendanceController,
    LeaveController
  ],
  providers: [
    AttendanceService,
    LeaveService,
  ],
  exports: [AttendanceService, LeaveService],
})
export class AttendanceModule {}
