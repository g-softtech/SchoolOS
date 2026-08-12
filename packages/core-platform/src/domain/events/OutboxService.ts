import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainEvent } from './DomainEvent.types';
import { randomUUID } from 'crypto';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  /**
   * Appends an event atomically using a provided Prisma transaction client.
   * Creates both a permanent historical record (DomainEventLog) and a delivery ticket (OutboxQueue).
   */
  async appendEvent(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    eventData: Omit<DomainEvent, 'eventId' | 'occurredAt'>
  ): Promise<DomainEvent> {
    const eventId = randomUUID();
    const occurredAt = new Date();
    
    const event = {
      ...eventData,
      eventId,
      occurredAt
    } as unknown as DomainEvent;

    // Serialize payload cleanly for the outbox
    const payload = event.payload as unknown as any;

    try {
      // 1. Permanent Historical Record
      await tx.domainEventLog.create({
        data: {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          version: event.version,
          occurredAt: event.occurredAt,
          correlationId: event.correlationId || '',
          causationId: event.causationId,
          tenantId: event.tenantId,
          payload: payload,
        }
      });

      // 2. Delivery Queue Ticket
      await tx.outboxQueue.create({
        data: {
          eventId: event.eventId,
          status: 'PENDING',
          aggregateId: event.aggregateId,
          tenantId: event.tenantId,
        }
      });

      return event;
    } catch (error) {
      this.logger.error(`Failed to append event to outbox: ${event.eventType}`, error);
      throw error;
    }
  }
}
