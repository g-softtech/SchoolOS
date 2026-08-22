import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class NotificationRecoveryCron {
  private readonly logger = new Logger(NotificationRecoveryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async recoverPendingNotifications() {
    this.logger.debug('Starting notification recovery sweep...');

    // Find notifications that have been PENDING for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const pending = await this.prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: fiveMinutesAgo,
        }
      },
      select: {
        id: true,
        tenantId: true,
      }
    });

    if (pending.length === 0) {
      return;
    }

    this.logger.warn(`Found ${pending.length} orphaned PENDING notifications. Re-enqueuing...`);

    let recovered = 0;
    for (const notification of pending) {
      try {
        // Enqueue using the DB id as the BullMQ jobId to guarantee idempotency.
        // If it's already in BullMQ (just processing slowly), BullMQ ignores this add() silently.
        await this.notificationQueue.add(
          'send',
          {
            notificationQueueId: notification.id,
            tenantId: notification.tenantId,
          },
          {
            jobId: notification.id,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
            removeOnComplete: { age: 7 * 24 * 3600 }, // 7 days retention
            removeOnFail: { age: 7 * 24 * 3600 },
          }
        );
        recovered++;
      } catch (err: any) {
        this.logger.error(`Failed to recover notification ${notification.id}: ${err.message}`);
      }
    }

    this.logger.log(`Successfully swept ${recovered}/${pending.length} orphaned notifications to BullMQ.`);
  }
}
