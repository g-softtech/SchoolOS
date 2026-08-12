import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubmitApplicationCommand } from '../commands/application.commands';
import { WorkflowEngine } from '@saas/workflow';

// Mock dependencies for the reference implementation
interface IdempotencyRepository {
  hasExecuted(key: string): Promise<boolean>;
  recordExecution(key: string, tenantId: string, aggregateId: string, commandType: string): Promise<void>;
}

interface ApplicationRepository {
  findById(tenantId: string, id: string): Promise<any>;
  save(application: any): Promise<void>;
}

@CommandHandler(SubmitApplicationCommand)
export class SubmitApplicationHandler implements ICommandHandler<SubmitApplicationCommand> {
  constructor(
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly applicationRepo: ApplicationRepository,
    private readonly workflowEngine: WorkflowEngine // Injected real engine
  ) {}

  async execute(command: SubmitApplicationCommand): Promise<void> {
    const idempotencyKey = `submit-app-${command.applicationId}-${command.actorId}`;
    
    // 1. Idempotency Check
    const alreadyExecuted = await this.idempotencyRepo.hasExecuted(idempotencyKey);
    if (alreadyExecuted) {
      console.log(`Command ${command.constructor.name} already executed. Skipping.`);
      return;
    }

    // 2. Fetch Aggregate
    const application = await this.applicationRepo.findById(command.tenantId, command.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // 2b. Aggregate Version Concurrency Check
    if (application.version !== command.expectedVersion) {
      throw new Error(`Concurrency Exception: Expected version ${command.expectedVersion} but got ${application.version}`);
    }

    // 3. Workflow Validation via SDK
    const context = { tenantId: command.tenantId, entityId: application.id, actorId: command.actorId, metadata: { currentState: application.status.value } };
    const canTransition = await this.workflowEngine.canTransition(context, 'SUBMITTED');
    if (!canTransition) throw new Error('Cannot submit from current state according to Workflow SDK');

    // 4. Mutate Aggregate (Workflow engine handles rules, aggregate just updates state)
    application.changeStatus('SUBMITTED');

    // 5. Save & Record Idempotency (Transactionally)
    // await this.applicationRepo.transaction(async (tx) => {
    //   await this.applicationRepo.save(application, tx);
    //   await this.idempotencyRepo.recordExecution(idempotencyKey, command.tenantId, application.id, 'SubmitApplicationCommand', tx);
    // });

    // Fallback simulation
    await this.applicationRepo.save(application);
    await this.idempotencyRepo.recordExecution(idempotencyKey, command.tenantId, application.id, 'SubmitApplicationCommand');

    console.log(`Successfully processed SubmitApplicationCommand for ${command.applicationId} (v${application.version})`);
  }
}
