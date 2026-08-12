import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsSubscriber {
  @OnEvent('Identity.User.Registered')
  async handleUserRegistered(event: any) {
    // In a real implementation, this would push to a telemetry queue or analytics projection.
    // For this module lifecycle, we acknowledge the event and log it.
    console.log(`[Analytics] New Global User Registered: ${event.payload.userId}`);
  }

  @OnEvent('Identity.User.LoggedIn')
  async handleUserLoggedIn(event: any) {
    console.log(`[Analytics] User Login Tracked: ${event.payload.userId} from ${event.payload.ipAddress}`);
  }
}
