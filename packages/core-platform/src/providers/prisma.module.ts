import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PlatformEventBus } from './platform-event-bus';
import { PlatformStorageService } from './platform-storage.service';
import { OutboxService } from '../domain/events/OutboxService';

@Module({
  providers: [PrismaService, PlatformEventBus, PlatformStorageService],
  exports: [PrismaService, PlatformEventBus, PlatformStorageService],
})
export class PrismaModule {}

import { PrismaClient } from '../../prisma/generated/client';

@Module({
  providers: [
    PrismaService,
    PlatformEventBus,
    PlatformStorageService,
    OutboxService,
    { provide: PrismaClient, useExisting: PrismaService },
  ],
  exports: [
    PrismaService,
    PlatformEventBus,
    PlatformStorageService,
    OutboxService,
    PrismaClient,
  ],
})
export class CorePlatformModule {}
