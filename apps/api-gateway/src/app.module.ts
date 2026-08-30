import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { DatabaseModule } from './database/database.module';
import { RedisCacheModule } from './platform-services/redis/redis.module';
import { ConfigurationModule } from './platform-services/configuration/configuration.module';
import { FeatureFlagsModule } from './platform-services/feature-flags/feature-flags.module';
import { EntitlementsModule } from './platform-services/entitlements/entitlements.module';
import { LicensingModule } from './platform-services/licensing/licensing.module';
import { StorageModule } from './platform-services/storage/storage.module';
import { AuditModule } from './platform-services/audit/audit.module';
import { IdentityModule } from './modules/identity/identity.module';
import { WebsiteModule } from './modules/website/website.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { StudentsModule } from './modules/students/students.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ExaminationsModule } from './modules/examinations/examinations.module';
import { FinanceModule } from './modules/finance/finance.module';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DocumentsModule } from './modules/documents/documents.module';
import { LibraryModule } from './modules/library/library.module';
import { TransportModule } from './modules/transport/transport.module';
import { HostelApiModule } from './modules/hostel/hostel.module';
import { ReportingApiModule } from './modules/reporting/reporting-api.module';
import { StaffModule } from './modules/staff/staff.module';
import { TimetablesModule } from './modules/timetables/timetables.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '../../.env.test' : '.env',
    }),
    DatabaseModule,
    RedisCacheModule,
    ConfigurationModule,
    FeatureFlagsModule,
    EntitlementsModule,
    LicensingModule,
    StorageModule,
    AuditModule,
    IdentityModule,
    WebsiteModule,
    AdmissionsModule,
    StudentsModule,
    AcademicsModule,
    AttendanceModule,
    ExaminationsModule,
    FinanceModule,
    DocumentsModule,
    LibraryModule,
    TransportModule,
    HostelApiModule,
    ReportingApiModule,
    StaffModule,
    TimetablesModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        if (process.env.NODE_ENV === 'test' || process.env.DISABLE_REDIS === 'true') {
          const RedisMock = require('ioredis-mock');
          return {
            connection: new RedisMock(),
          };
        }
        return {
          connection: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
            password: configService.get('REDIS_PASSWORD'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
