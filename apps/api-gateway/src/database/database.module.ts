import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseModule — Global NestJS module.
 *
 * Registers PrismaService as a global provider, making it available
 * to every module in the application without requiring explicit imports.
 * This is the single source of truth for database access across the platform.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
