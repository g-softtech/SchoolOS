import { Sse, MessageEvent, Controller, UseGuards } from '@nestjs/common';
import { Observable, filter, map } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FamilyContextGuard } from '../auth/FamilyContext.guard';
import { GetFamilyContext } from '../auth/FamilyContext.decorator';
import { FamilyContext } from '../auth/FamilyContext';

@Controller('api/parent/events')
@UseGuards(FamilyContextGuard)
export class ParentEventsController {
  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Subscribes the parent to Server-Sent Events (SSE) scoped strictly to their FamilyContext.
   * This handles the hybrid real-time requirement (Pushing Attendance/Payment events).
   */
  @Sse('stream')
  streamEvents(@GetFamilyContext() context: FamilyContext): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const listener = (event: any) => {
        if (context.studentIds.includes(event.studentId) || event.guardianId === context.guardianId) {
          subscriber.next({
            data: {
              type: event.type,
              payload: event.payload,
              timestamp: new Date().toISOString()
            }
          });
        }
      };

      this.eventEmitter.on('attendance.*', listener);
      this.eventEmitter.on('finance.payment.*', listener);

      return () => {
        this.eventEmitter.off('attendance.*', listener);
        this.eventEmitter.off('finance.payment.*', listener);
      };
    });
  }
}
