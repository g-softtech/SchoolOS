import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService, LeaveType, LeaveStatus } from '@saas/core-platform';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submits a leave request for a staff member.
   */
  async submitLeaveRequest(
    tenantId: string, 
    staffId: string, 
    type: LeaveType, 
    startDate: Date, 
    endDate: Date, 
    reason?: string
  ) {
    // 1. Verify staff belongs to tenant
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId },
    });
    
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        tenantId,
        staffId,
        type,
        startDate,
        endDate,
        reason,
        status: 'PENDING',
      },
    });

    this.logger.log(`Leave request submitted for staff ${staffId} from ${startDate} to ${endDate}`);
    return leaveRequest;
  }

  /**
   * Approves or rejects a leave request.
   */
  async reviewLeaveRequest(
    tenantId: string, 
    requestId: string, 
    status: LeaveStatus, 
    reviewerId: string
  ) {
    const existing = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, tenantId }
    });

    if (!existing) {
      throw new NotFoundException('Leave request not found');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status },
    });

    this.logger.log(`Leave request ${requestId} reviewed: ${status} by user ${reviewerId}`);
    return updated;
  }

  /**
   * Retrieves leave requests for a tenant.
   */
  async getLeaveRequests(tenantId: string, status?: LeaveStatus) {
    const whereClause: any = { tenantId };
    if (status) {
      whereClause.status = status;
    }
    
    return this.prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        staff: {
          include: {
            membership: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}
