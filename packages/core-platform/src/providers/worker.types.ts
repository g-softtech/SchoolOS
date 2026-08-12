import { BackgroundWorker, WorkerMetrics } from './index';

export interface ProjectionWorker<T> extends BackgroundWorker<T> {
  replayEvents(fromVersion: number, toVersion: number): Promise<void>;
  resetProjection(): Promise<void>;
}

export interface NotificationWorker<T> extends BackgroundWorker<T> {
  // specific notification handling
}

export interface ReportWorker<T> extends BackgroundWorker<T> {
  // specialized for heavy analytic queries
}

export interface StorageWorker<T> extends BackgroundWorker<T> {
  // specialized for dealing with big files
}

export interface CleanupWorker<T> extends BackgroundWorker<T> {
  // maintenance tasks
}

export interface SchedulerWorker<T> extends BackgroundWorker<T> {
  // manages recurring tasks
}
