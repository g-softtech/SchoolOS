import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated/client';
import { CredentialService, IssueCredentialRequest } from './CredentialService';

export interface BatchIssueRequest {
  tenantId: string;
  jobType: 'NEW_SESSION' | 'REISSUE' | 'GRADUATION';
  targetUserIds: string[];
  ownerType: string;
  medium: string;
}

@Injectable()
export class CredentialBatchService {
  private readonly logger = new Logger(CredentialBatchService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly credentialService: CredentialService
  ) {}

  /**
   * Initializes a batch issuance job. This is resumable.
   */
  async initializeBatchJob(req: BatchIssueRequest) {
    const job = await this.prisma.credentialPrintJob.create({
      data: {
        tenantId: req.tenantId,
        jobType: req.jobType,
        status: 'PENDING',
        progress: 0,
        jobDetails: JSON.stringify({
          targetUserIds: req.targetUserIds,
          ownerType: req.ownerType,
          medium: req.medium,
          processedIds: [],
          failedIds: []
        })
      }
    });

    // In a real implementation, we would publish this job ID to a message queue (e.g. BullMQ)
    // for background worker processing to prevent blocking the HTTP request.
    this.logger.log(`Initialized Batch Job ${job.id} for ${req.targetUserIds.length} users.`);
    return job.id;
  }

  /**
   * Worker function to process chunks of the batch job. Resumable.
   */
  async processBatchJob(jobId: string, batchSize: number = 50) {
    const job = await this.prisma.credentialPrintJob.findUnique({ where: { id: jobId } });
    if (!job || job.status === 'COMPLETED' || job.status === 'FAILED') return;

    await this.prisma.credentialPrintJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' }
    });

    const details = JSON.parse(job.jobDetails);
    const { targetUserIds, ownerType, medium, processedIds, failedIds } = details;

    const remainingIds = targetUserIds.filter((id: string) => !processedIds.includes(id) && !failedIds.includes(id));
    const chunk = remainingIds.slice(0, batchSize);

    if (chunk.length === 0) {
      // Finished
      await this.prisma.credentialPrintJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', progress: 100 }
      });
      this.logger.log(`Batch Job ${jobId} Completed.`);
      return;
    }

    let successes = 0;

    for (const userId of chunk) {
      try {
        await this.credentialService.issueNewCredential({
          tenantId: job.tenantId,
          userId,
          ownerType,
          medium
        });
        processedIds.push(userId);
        successes++;
      } catch (err) {
        this.logger.error(`Failed to issue credential in batch ${jobId} for user ${userId}: ${err.message}`);
        failedIds.push(userId);
      }
    }

    // Update Progress
    const totalProcessed = processedIds.length + failedIds.length;
    const progress = Math.floor((totalProcessed / targetUserIds.length) * 100);

    await this.prisma.credentialPrintJob.update({
      where: { id: jobId },
      data: {
        progress,
        jobDetails: JSON.stringify({ targetUserIds, ownerType, medium, processedIds, failedIds })
      }
    });

    this.logger.log(`Batch Job ${jobId} Progress: ${progress}% (${successes} successful in this chunk)`);

    // If there are more remaining, the worker loop would pick it up again.
  }
}
