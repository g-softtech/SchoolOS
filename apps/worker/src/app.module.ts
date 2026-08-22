import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@saas/core-platform';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationRecoveryCron } from './cron/notification-recovery.cron';
import { TermiiProvider } from './providers/termii.provider';
import { SendGridProvider } from './providers/sendgrid.provider';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    NotificationProcessor,
    NotificationRecoveryCron,
    TermiiProvider,
    SendGridProvider,
  ],
})
export class AppModule {}
