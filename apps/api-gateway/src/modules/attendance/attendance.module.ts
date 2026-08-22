import { Module } from '@nestjs/common';
import { PrismaModule } from '@saas/core-platform';
import { AttendanceService } from './services/attendance.service';
import { LeaveService } from './services/leave.service';
import { ScannerService } from './services/scanner.service';
import { AttendanceController } from './controllers/attendance.controller';
import { LeaveController } from './controllers/leave.controller';
import { ScannerController } from './controllers/scanner.controller';

@Module({
  imports: [PrismaModule], 
  controllers: [
    AttendanceController,
    LeaveController,
    ScannerController
  ],
  providers: [
    AttendanceService,
    LeaveService,
    ScannerService
  ],
  exports: [AttendanceService, LeaveService, ScannerService],
})
export class AttendanceModule {}
