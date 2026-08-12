import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

// Define the Domain Event
export class ApplicationSubmittedEvent {
  constructor(
    public readonly applicationId: string,
    public readonly tenantId: string,
    public readonly timestamp: Date
  ) {}
}

// Mock Projection Repository for reference
interface DashboardProjectionRepository {
  incrementTotalApplications(tenantId: string): Promise<void>;
  incrementPendingReviews(tenantId: string): Promise<void>;
  recalculateConversionRate(tenantId: string): Promise<void>;
}

@EventsHandler(ApplicationSubmittedEvent)
export class DashboardProjectionUpdater implements IEventHandler<ApplicationSubmittedEvent> {
  constructor(private readonly projectionRepo: DashboardProjectionRepository) {}

  async handle(event: ApplicationSubmittedEvent) {
    console.log(`[Projection Updater] Received ApplicationSubmittedEvent for ${event.applicationId}`);

    // Update Materialized Read Table
    await this.projectionRepo.incrementTotalApplications(event.tenantId);
    await this.projectionRepo.incrementPendingReviews(event.tenantId);
    await this.projectionRepo.recalculateConversionRate(event.tenantId);

    console.log(`[Projection Updater] Dashboard projection updated for Tenant: ${event.tenantId}`);
  }
}
