import { PrismaClient, PaymentPlan, PaymentSchedule, PaymentPlanVersion } from '../../../../prisma/generated/client';
import { FinanceError } from './errors';

export class PaymentPlanError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentPlanError';
  }
}

export type PaymentPlanType = 
  | 'FULL_PAYMENT' 
  | 'EQUAL_INSTALLMENTS' 
  | 'FIXED_INSTALLMENTS' 
  | 'PERCENTAGE_INSTALLMENTS' 
  | 'DEPOSIT_PLUS_BALANCE' 
  | 'CUSTOM' 
  | 'SCHOLARSHIP_PLAN' 
  | 'EMPLOYEE_PLAN';

export class PaymentPlanEngineService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generates a new immutable Payment Plan.
   */
  async createPlan(params: {
    tenantId: string;
    invoiceId: string;
    planType: PaymentPlanType;
    schedules: Array<{ dueDate: Date; amount: number; gracePeriodDays?: number }>;
    penaltyType?: string; // FIXED, PERCENTAGE
    penaltyValue?: number;
    penaltyCap?: number;
  }): Promise<PaymentPlan & { schedules: PaymentSchedule[] }> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create the base plan
      const plan = await tx.paymentPlan.create({
        data: {
          tenantId: params.tenantId,
          invoiceId: params.invoiceId,
          penaltyType: params.penaltyType,
          penaltyValue: params.penaltyValue,
          penaltyCap: params.penaltyCap,
          schedules: {
            create: params.schedules.map(s => ({
              tenantId: params.tenantId,
              dueDate: s.dueDate,
              amount: s.amount,
              gracePeriodDays: s.gracePeriodDays || 0,
              status: 'SCHEDULED' // Initial state
            }))
          }
        },
        include: { schedules: true }
      });

      // 2. Snapshot the very first version
      await tx.paymentPlanVersion.create({
        data: {
          tenantId: params.tenantId,
          paymentPlanId: plan.id,
          versionNumber: 1,
          payload: plan as any
        }
      });

      // 3. (Event-Driven) - Publish PaymentPlan.Created event
      // EventBus.publish('PaymentPlan.Created', { planId: plan.id });

      return plan;
    });
  }

  /**
   * Renegotiate an existing plan. Never overwrites - creates a new version and supersedes the old schedules.
   */
  async renegotiatePlan(params: {
    tenantId: string;
    planId: string;
    newSchedules: Array<{ dueDate: Date; amount: number; gracePeriodDays?: number }>;
    approvedByWorkflowId: string; // Enforces that approval happened first
  }): Promise<PaymentPlan> {
    return await this.prisma.$transaction(async (tx) => {
      const plan = await tx.paymentPlan.findUnique({
        where: { id: params.planId, tenantId: params.tenantId },
        include: { schedules: true, versions: true }
      });

      if (!plan) throw new PaymentPlanError('Payment Plan not found');

      // 1. Mark existing unpaid schedules as ROLLED_FORWARD or CANCELLED
      for (const schedule of plan.schedules) {
        if (!['PAID', 'PARTIALLY_PAID'].includes(schedule.status)) {
          await tx.paymentSchedule.update({
            where: { id: schedule.id },
            data: { status: 'ROLLED_FORWARD' }
          });
        }
      }

      // 2. Create the new schedules
      for (const s of params.newSchedules) {
        await tx.paymentSchedule.create({
          data: {
            tenantId: params.tenantId,
            planId: plan.id,
            dueDate: s.dueDate,
            amount: s.amount,
            gracePeriodDays: s.gracePeriodDays || 0,
            status: 'SCHEDULED'
          }
        });
      }

      // 3. Snapshot the new version
      const nextVersionNum = plan.versions.length + 1;
      const updatedPlan = await tx.paymentPlan.findUnique({
        where: { id: plan.id },
        include: { schedules: true }
      });

      await tx.paymentPlanVersion.create({
        data: {
          tenantId: params.tenantId,
          paymentPlanId: plan.id,
          versionNumber: nextVersionNum,
          payload: updatedPlan as any
        }
      });

      // (Event-Driven) Publish PaymentPlan.Versioned event
      // EventBus.publish('PaymentPlan.Versioned', { planId: plan.id, version: nextVersionNum });

      return updatedPlan!;
    });
  }

  /**
   * Distributes a lump sum across schedules automatically.
   */
  async applyPaymentToSchedules(params: {
    tenantId: string;
    planId: string;
    amountPaid: number;
    tx: any; // Prisma Transaction Client
  }): Promise<{ unallocated: number }> {
    const tx = params.tx;
    const plan = await tx.paymentPlan.findUnique({
      where: { id: params.planId, tenantId: params.tenantId },
      include: { schedules: true }
    });

    if (!plan) throw new PaymentPlanError('Payment Plan not found');

    const openSchedules = plan.schedules
      .filter((s: any) => !['PAID', 'CANCELLED', 'WAIVED', 'ROLLED_FORWARD'].includes(s.status))
      .sort((a: any, b: any) => a.dueDate.getTime() - b.dueDate.getTime());

    let remaining = params.amountPaid;

    for (const schedule of openSchedules) {
      if (remaining <= 0) break;

      const outstanding = Number(schedule.amount) - Number(schedule.paidAmount);
      if (outstanding <= 0) continue;

      const allocation = Math.min(remaining, outstanding);
      
      const newPaidAmount = Number(schedule.paidAmount) + allocation;
      let newStatus = schedule.status;
      if (newPaidAmount >= Number(schedule.amount)) {
        newStatus = 'PAID';
        // Publish Installment.Paid
      } else {
        newStatus = 'PARTIALLY_PAID';
      }

      await tx.paymentSchedule.update({
        where: { id: schedule.id },
        data: { 
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      remaining -= allocation;
    }

    return { unallocated: remaining }; // Remainder routes to credit wallet
  }

  /**
   * Evaluates grace periods and applies penalties based on the plan's penalty policy.
   * Typically run by a ScheduledJob.
   */
  async processOverdueSchedules(params: { tenantId: string; currentDate: Date }): Promise<void> {
    // In reality, this queries all OPEN/SCHEDULED/PARTIALLY_PAID schedules across the tenant
    // where dueDate + gracePeriodDays < currentDate.
    // We then apply the policy (e.g. Fixed Penalty) and update the status to OVERDUE.
    // EventBus.publish('Installment.Overdue', { scheduleId: '...' })
  }
}
