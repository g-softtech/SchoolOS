import { Module } from '@nestjs/common';
import { 
  HostelBuildingService,
  HostelRoomService,
  HostelAllocationService,
  CorePlatformModule
} from '@saas/core-platform';
import { HostelsController } from './controllers/hostels.controller';
import { RoomsController } from './controllers/rooms.controller';
import { AllocationsController } from './controllers/allocations.controller';

@Module({
  imports: [CorePlatformModule],
  controllers: [HostelsController, RoomsController, AllocationsController],
  providers: [
    HostelBuildingService,
    HostelRoomService,
    HostelAllocationService
  ]
})
export class HostelApiModule {}
