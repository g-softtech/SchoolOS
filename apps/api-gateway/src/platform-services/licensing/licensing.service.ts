import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubStatus } from '@saas/core-platform';

@Injectable()
export class LicensingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verify if the tenant has an active subscription or is within a grace period.
   * Throws ForbiddenException if access should be denied.
   */
  async verifyActiveSubscription(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptions: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found.');
    }

    // A tenant can have multiple subscriptions (e.g. Add-ons), we check the main PlatformSubscription
    const activeSubscription = tenant.subscriptions.find(
      (sub) => sub.status === SubStatus.ACTIVE || sub.status === SubStatus.PAST_DUE
    );

    if (!activeSubscription) {
      throw new ForbiddenException('No active subscription found. Please renew your plan to continue using the platform.');
    }

    const now = new Date();
    const isExpired = activeSubscription.currentPeriodEnd < now;

    if (isExpired && activeSubscription.status !== SubStatus.PAST_DUE) {
      // Mark as past due if grace period logic allows, or block directly
      throw new ForbiddenException('Subscription has expired. Please renew your plan.');
    }

    // If past due but within a 7-day grace period
    if (activeSubscription.status === SubStatus.PAST_DUE) {
      const gracePeriodEnd = new Date(activeSubscription.currentPeriodEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7 days grace

      if (now > gracePeriodEnd) {
        throw new ForbiddenException('Subscription grace period has ended. Access revoked until renewal.');
      }
    }
  }
}
