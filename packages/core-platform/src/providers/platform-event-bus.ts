import { Injectable } from '@nestjs/common';
import { DomainEvent } from '../domain/events';

@Injectable()
export class PlatformEventBus {
  async publish(event: string | DomainEvent | any, payload?: any): Promise<void> {
    // Stub implementation
  }

  async publishAll(events: DomainEvent[] | any[]): Promise<void> {
    // Stub implementation
  }
}
