import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { PrismaService } from './database/prisma.service';
import { RedisCacheModule } from './platform-services/redis/redis.module';
import { ConfigurationModule } from './platform-services/configuration/configuration.module';
import { FeatureFlagsModule } from './platform-services/feature-flags/feature-flags.module';
import { EntitlementsModule } from './platform-services/entitlements/entitlements.module';
import { LicensingModule } from './platform-services/licensing/licensing.module';
import { StorageModule } from './platform-services/storage/storage.module';
import { AuditModule } from './platform-services/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisCacheModule,
    ConfigurationModule,
    FeatureFlagsModule,
    EntitlementsModule,
    LicensingModule,
    StorageModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
