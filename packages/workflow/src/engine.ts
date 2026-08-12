import { WorkflowEngine, TransitionResult, WorkflowContext } from './index';

export interface WorkflowConfig {
  states: string[];
  transitions: Record<string, string[]>; // e.g. { "SUBMITTED": ["UNDER_REVIEW", "REJECTED"] }
}

export interface WorkflowDefinitionProvider {
  getDefinition(tenantId: string, module: string, name: string): Promise<WorkflowConfig>;
}

export class DatabaseWorkflowEngine extends WorkflowEngine {
  constructor(
    private readonly provider: WorkflowDefinitionProvider,
    private readonly moduleName: string,
    private readonly definitionName: string
  ) {
    super();
  }

  async canTransition(context: WorkflowContext, targetStage: string): Promise<boolean> {
    const current = await this.currentStage(context);
    const config = await this.provider.getDefinition(context.tenantId, this.moduleName, this.definitionName);
    
    if (!config.states.includes(targetStage)) return false;
    const allowed = config.transitions[current] || [];
    return allowed.includes(targetStage);
  }

  async transition(context: WorkflowContext, targetStage: string, reason?: string): Promise<TransitionResult> {
    const current = await this.currentStage(context);
    const can = await this.canTransition(context, targetStage);
    
    if (!can) {
      return {
        success: false,
        previousStage: current,
        newStage: current,
        reason: 'Invalid transition configuration'
      };
    }
    
    // In real implementation, we would persist this new state onto the aggregate or context reference.
    return {
      success: true,
      previousStage: current,
      newStage: targetStage,
      reason
    };
  }

  async currentStage(context: WorkflowContext): Promise<string> {
    // Usually retrieved from the context's aggregate via DB
    return context.metadata?.currentState || 'DRAFT';
  }

  async availableTransitions(context: WorkflowContext): Promise<string[]> {
    const current = await this.currentStage(context);
    const config = await this.provider.getDefinition(context.tenantId, this.moduleName, this.definitionName);
    return config.transitions[current] || [];
  }
}
