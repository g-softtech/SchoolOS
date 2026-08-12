import { Module } from '@nestjs/common';
import { RegisterService } from './services/register.service';
import { ScanService } from './services/scan.service';
import { LeaveService } from './services/leave.service';
import { PrismaService } from '@saas/core-platform';
// import { StaffModule } from '../staff/staff.module'; // Will import once we need credential validation

@Module({
  imports: [], // CorePlatformModule might be global, but we inject PrismaService
  providers: [
    RegisterService, 
    ScanService, 
    LeaveService,
    // Add PrismaService if not globally exported, but usually it is in NestJS. We'll assume it's available or we can inject it.
  ],
  exports: [RegisterService, ScanService, LeaveService],
})
export class AttendanceModule {}
