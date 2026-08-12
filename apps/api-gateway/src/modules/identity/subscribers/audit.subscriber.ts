import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaClient } from '@saas/core-platform';
import { tenantContextStorage } from '@saas/core-platform';

@Injectable()
export class AuditSubscriber {
  constructor(private readonly prisma: PrismaClient) {}

  @OnEvent('Identity.*')
  async handleIdentityEvents(event: any) {
    // We execute inside ALS to preserve context across boundaries if a tenantId is provided.
    // If it's a global event, tenantId is null.
    const tenantId = event.payload?.tenantId || null;

    await tenantContextStorage.run({ tenantId, roleId: null }, async () => {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: event.eventName,
          entity: 'Event',
          entityId: 'SYSTEM',
          metadata: event.payload,
        }
      });
    });
  }
}
