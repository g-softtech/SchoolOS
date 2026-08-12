import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PlatformEventBus } from './platform-event-bus';
import { PlatformStorageService } from './platform-storage.service';

@Module({
  providers: [PrismaService, PlatformEventBus, PlatformStorageService],
  exports: [PrismaService, PlatformEventBus, PlatformStorageService],
})
export class PrismaModule {}

@Module({
  providers: [PrismaService, PlatformEventBus, PlatformStorageService],
  exports: [PrismaService, PlatformEventBus, PlatformStorageService],
})
export class CorePlatformModule {}
