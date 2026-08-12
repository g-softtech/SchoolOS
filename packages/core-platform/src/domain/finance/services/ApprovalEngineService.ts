import { PrismaClient, ApprovalWorkflow, ApprovalStep } from '../../../../prisma/generated/client';
import { FinanceError } from './errors';

export class ApprovalError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalError';
  }
}

export type ApprovalType = 
  | 'REFUND' 
  | 'WAIVER' 
  | 'WRITE_OFF' 
  | 'VOID_INVOICE' 
  | 'RENEGOTIATE_PLAN' 
  | 'SCHOLARSHIP' 
  | 'MANUAL_ADJUSTMENT'
  | 'PAYROLL' 
  | 'PURCHASE';

export interface ApprovalChainConfig {
  level: number;
  role: string;
}

export class ApprovalEngineService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Evaluates the approval policy to determine the required chain of approvers.
   * In a real system, this reads from a Tenant-configured Rules Engine.
   */
  private determineApprovalChain(type: ApprovalType, amount?: number): ApprovalChainConfig[] {
    const chain: ApprovalChainConfig[] = [];
    
    // Example Policy Logic
    if (type === 'REFUND') {
      chain.push({ level: 1, role: 'FINANCE_MANAGER' });
      if (amount && amount > 100000) {
        chain.push({ level: 2, role: 'BURSAR' });
      }
      if (amount && amount > 500000) {
        chain.push({ level: 3, role: 'PRINCIPAL' });
      }
    } else if (type === 'VOID_INVOICE') {
      chain.push({ level: 1, role: 'BURSAR' });
    } else {
      chain.push({ level: 1, role: 'ADMIN' }); // Fallback
    }

    return chain;
  }

  /**
   * Initiates a new high-risk operation that requires approval.
   */
  async requestApproval(params: {
    tenantId: string;
    type: ApprovalType;
    referenceId: string; // The ID of the drafted entity (e.g. Refund request ID)
    requesterId: string;
    amount?: number;
  }): Promise<ApprovalWorkflow & { steps: ApprovalStep[] }> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Determine Chain
      const chain = this.determineApprovalChain(params.type, params.amount);

      // 2. Create the Workflow Escrow
      const workflow = await tx.approvalWorkflow.create({
        data: {
          tenantId: params.tenantId,
          type: params.type,
          referenceId: params.referenceId,
          status: 'PENDING',
          amount: params.amount,
          requesterId: params.requesterId,
          steps: {
            create: chain.map(step => ({
              tenantId: params.tenantId,
              level: step.level,
              approverRole: step.role,
              status: 'PENDING'
            }))
          }
        },
        include: { steps: true }
      });

      // (Event-Driven) EventBus.publish('Approval.Requested', { workflowId: workflow.id });

      return workflow;
    });
  }

  /**
   * Approves a step in the workflow. 
   * If this is the final step, the workflow becomes APPROVED and downstream execution is triggered.
   */
  async approveStep(params: {
    tenantId: string;
    workflowId: string;
    approverId: string;
    approverRole: string; // The role the user is acting as
    comments?: string;
  }): Promise<ApprovalWorkflow> {
    return await this.prisma.$transaction(async (tx) => {
      const workflow = await tx.approvalWorkflow.findUnique({
        where: { id: params.workflowId, tenantId: params.tenantId },
        include: { steps: { orderBy: { level: 'asc' } } }
      });

      if (!workflow) throw new ApprovalError('Workflow not found');
      if (workflow.status !== 'PENDING') throw new ApprovalError(`Cannot approve a workflow in ${workflow.status} state`);

      // 1. Find the next pending step
      const currentStep = workflow.steps.find(s => s.status === 'PENDING');
      if (!currentStep) throw new ApprovalError('No pending steps found in workflow');

      // 2. Validate role authorization
      if (currentStep.approverRole !== params.approverRole) {
        throw new ApprovalError(`Unauthorized: This step requires ${currentStep.approverRole}, but user is acting as ${params.approverRole}`);
      }

      // 3. Mark step approved
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: 'APPROVED',
          approverId: params.approverId,
          comments: params.comments
        }
      });

      // 4. Check if workflow is complete
      const isFinalStep = workflow.steps.every(s => s.id === currentStep.id || s.status === 'APPROVED');
      
      if (isFinalStep) {
        const completedWorkflow = await tx.approvalWorkflow.update({
          where: { id: workflow.id },
          data: { status: 'APPROVED' }
        });

        // (Event-Driven) The core domain listens to this event to safely execute the action.
        // e.g. PaymentProcessingService listens to 'Approval.Completed.REFUND' and triggers Gateway refund.
        // EventBus.publish(`Approval.Completed.${workflow.type}`, { referenceId: workflow.referenceId });
        
        return completedWorkflow;
      }

      return workflow;
    });
  }

  /**
   * Rejects a workflow outright.
   */
  async rejectWorkflow(params: {
    tenantId: string;
    workflowId: string;
    approverId: string;
    comments: string;
  }): Promise<ApprovalWorkflow> {
    return await this.prisma.approvalWorkflow.update({
      where: { id: params.workflowId, tenantId: params.tenantId },
      data: { status: 'REJECTED' }
    });
  }
}
