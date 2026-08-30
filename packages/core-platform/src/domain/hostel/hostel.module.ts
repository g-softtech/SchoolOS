import { Module } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { HostelBuildingService } from './services/HostelBuildingService';
import { HostelRoomService } from './services/HostelRoomService';
import { HostelAllocationService } from './services/HostelAllocationService';

@Module({
  providers: [
    HostelBuildingService,
    HostelRoomService,
    HostelAllocationService,
  ],
  exports: [
    HostelBuildingService,
    HostelRoomService,
    HostelAllocationService,
  ],
})
export class HostelModule {}
