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
    // We listen to a wildcard of domain events, but we strictly filter them 
    // to ensure they only emit if the event payload's studentId is in the FamilyContext
    return this.eventEmitter.listenTo(['attendance.*', 'finance.payment.*']).pipe(
      filter((event: any) => context.studentIds.includes(event.studentId) || event.guardianId === context.guardianId),
      map((event: any) => ({
        data: {
          type: event.type, // e.g., 'Attendance.CheckedIn'
          payload: event.payload,
          timestamp: new Date().toISOString()
        }
      }))
    );
  }
}
