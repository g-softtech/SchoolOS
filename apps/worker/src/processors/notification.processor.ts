import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { TermiiProvider } from '../providers/termii.provider';
import { SendGridProvider } from '../providers/sendgrid.provider';
import { DeliveryReceipt } from '@saas/core-platform';

@Injectable()
@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly termii: TermiiProvider,
    private readonly sendgrid: SendGridProvider,
  ) {
    super();
  }

  async process(job: Job<{ notificationQueueId: string, tenantId: string }>): Promise<any> {
    const { notificationQueueId, tenantId } = job.data;
    
    // 1. Strict Tenant + State Isolation check
    const notification = await this.prisma.notificationQueue.findFirst({
      where: {
        id: notificationQueueId,
        tenantId,
        status: 'PENDING',
      },
      include: {
        user: {
          include: {
            memberships: {
              where: { tenantId },
              include: { profile: true }
            }
          }
        },
      },
    });

    if (!notification) {
      // Abort silently - might be already processed or deleted
      this.logger.debug(`Notification ${notificationQueueId} is not PENDING or invalid.`);
      return;
    }

    const payload = notification.payload as Record<string, any>;
    const body = payload.body || '';
    const subject = payload.subject || 'Notification';

    let receipt: DeliveryReceipt = { success: false, error: 'Unknown Channel' };

    const phone = notification.user?.memberships?.[0]?.profile?.phone || '';

    try {
      // 2. Dispatch using the right provider
      if (notification.channel === 'SMS') {
        receipt = await this.termii.sendSms(phone, body);
      } else if (notification.channel === 'WHATSAPP') {
        receipt = await this.termii.sendWhatsApp(phone, body);
      } else if (notification.channel === 'EMAIL') {
        receipt = await this.sendgrid.sendEmail({
          to: notification.user.email || '',
          subject,
          data: { body }
        });
      }

      // 3. Conditional State Update
      if (receipt.success) {
        await this.handleTerminalState(notification.id, tenantId, 'SENT', receipt, payload, notification.userId);
      } else {
        throw new Error(receipt.error || 'Provider rejected message');
      }

    } catch (error: any) {
      this.logger.error(`Failed to process notification ${notificationQueueId}: ${error.message}`);
      
      // For persistent errors (e.g. invalid number), BullMQ will retry based on config.
      // If we exceed attempts, BullMQ moves it to 'failed', we can catch that in a listener.
      // But we can also track attempt counts locally. Since BullMQ handles it, we throw to trigger retry.
      throw error;
    }
  }

  private async handleTerminalState(
    id: string,
    tenantId: string,
    status: 'SENT' | 'FAILED',
    receipt: DeliveryReceipt,
    originalPayload: any,
    userId: string
  ) {
    const deliveryMeta = {
      providerMessageId: receipt.providerMessageId,
      error: receipt.error,
      deliveredAt: new Date().toISOString(),
    };

    const newPayload = {
      ...originalPayload,
      delivery: deliveryMeta,
    };

    // Use a transaction for safe conditional updates + audit
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.notificationQueue.updateMany({
        where: { id, tenantId, status: 'PENDING' },
        data: { status, payload: newPayload },
      });

      // If updated, create idempotent audit log
      if (result.count > 0) {
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: status === 'SENT' ? 'NOTIFICATION_SENT' : 'NOTIFICATION_FAILED',
            entity: 'NotificationQueue',
            entityId: id,
            metadata: deliveryMeta,
          }
        });
      }
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      const { notificationQueueId, tenantId } = job.data;
      
      const notification = await this.prisma.notificationQueue.findUnique({
        where: { id: notificationQueueId },
      });

      if (notification) {
        await this.handleTerminalState(
          notificationQueueId, 
          tenantId, 
          'FAILED', 
          { success: false, error: error.message }, 
          notification.payload,
          notification.userId
        );
      }
    }
  }
}
