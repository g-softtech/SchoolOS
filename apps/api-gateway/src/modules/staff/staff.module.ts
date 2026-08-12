import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { CredentialService } from './credential.service';
import { PrismaModule } from '@saas/core-platform';

@Module({
  imports: [PrismaModule],
  controllers: [StaffController],
  providers: [StaffService, CredentialService],
  exports: [StaffService, CredentialService],
})
export class StaffModule {}
