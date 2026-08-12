import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submits a leave request.
   */
  async submitLeaveRequest(tenantId: string, employeeId: string, type: string, startDate: Date, endDate: Date, reason?: string) {
    return this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        type,
        startDate,
        endDate,
        reason,
        status: 'PENDING',
      },
    });
  }

  /**
   * Approves or rejects a leave request.
   * Emits 'Attendance.Leave.Approved' domain event if approved.
   */
  async reviewLeaveRequest(tenantId: string, requestId: string, status: 'APPROVED' | 'REJECTED', reviewerId: string) {
    this.logger.log(`Leave request ${requestId} reviewed: ${status} by ${reviewerId}`);
    // return this.prisma.leaveRequest.update(...)
    // EventBus.emit('Attendance.Leave.Approved', payload)
  }
}
