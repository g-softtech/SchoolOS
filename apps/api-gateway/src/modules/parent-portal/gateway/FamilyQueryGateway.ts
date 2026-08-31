import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainHealthStatus } from '../dto/ViewModels';

export interface QueryOptions {
  timeoutMs: number;
  retries: number;
  queryName: string;
}

@Injectable()
export class FamilyQueryGateway {
  private readonly logger = new Logger(FamilyQueryGateway.name);

  /**
   * Executes a downstream query with strict timeout and retry budgets.
   * Swallows errors so the Dashboard Service can easily degrade gracefully.
   */
  async executeSafely<T>(
    operation: () => Promise<T>,
    options: QueryOptions,
    clientCorrelationId?: string
  ): Promise<{ data: T | null; status: DomainHealthStatus; correlationId: string }> {
    // End-to-End Correlation ID tracking
    const correlationId = clientCorrelationId || randomUUID();
    let attempt = 0;

    while (attempt <= options.retries) {
      try {
        const result = await this.withTimeout(operation(), options.timeoutMs);
        return { data: result, status: { status: 'OK' }, correlationId };
      } catch (error) {
        attempt++;
        this.logger.warn(`Query ${options.queryName} failed (Attempt ${attempt}/${options.retries + 1}). Error: ${error.message} [CorrID: ${correlationId}]`);
        
        if (attempt > options.retries) {
          this.logger.error(`Query ${options.queryName} exhausted retries. Degrading response. Error: ${error.stack} [CorrID: ${correlationId}]`);
          return { 
            data: null, 
            status: { status: 'DEGRADED', reason: error.message, retryAfterSeconds: 30 }, 
            correlationId 
          };
        }
      }
    }

    return { 
      data: null, 
      status: { status: 'UNAVAILABLE', reason: 'Unknown failure', retryAfterSeconds: 60 }, 
      correlationId 
    };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
  }
}
