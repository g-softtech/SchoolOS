export interface WorkflowContext {
  tenantId: string;
  entityId: string;
  actorId: string;
  metadata?: Record<string, any>;
}

export interface TransitionRule {
  fromStage: string;
  toStage: string;
  requiresReview?: boolean;
  requiredRole?: string;
}

export interface StateMachineDefinition {
  id: string;
  name: string;
  stages: string[];
  rules: TransitionRule[];
  initialStage: string;
}

export interface TransitionResult {
  success: boolean;
  previousStage: string;
  newStage: string;
  reason?: string;
}

export abstract class WorkflowEngine {
  abstract canTransition(context: WorkflowContext, targetStage: string): Promise<boolean>;
  abstract transition(context: WorkflowContext, targetStage: string, reason?: string): Promise<TransitionResult>;
  abstract currentStage(context: WorkflowContext): Promise<string>;
  abstract availableTransitions(context: WorkflowContext): Promise<string[]>;
}
