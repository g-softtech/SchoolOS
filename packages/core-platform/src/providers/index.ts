export interface FileDetails {
  key: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(bucket: string, key: string, stream: any): Promise<FileDetails>;
  download(bucket: string, key: string): Promise<any>;
  delete(bucket: string, key: string): Promise<boolean>;
  getSignedUrl(bucket: string, key: string, expiresIn: number): Promise<string>;
}

export interface SearchHit<T> {
  id: string;
  score: number;
  source: T;
}

export interface SearchProvider {
  index<T>(indexName: string, id: string, document: T): Promise<void>;
  search<T>(indexName: string, query: string, options?: any): Promise<SearchHit<T>[]>;
  delete(indexName: string, id: string): Promise<void>;
}

export interface NotificationPayload {
  to: string;
  subject: string;
  templateId?: string;
  data?: Record<string, any>;
}

export interface NotificationProvider {
  sendEmail(payload: NotificationPayload): Promise<boolean>;
  sendSms(to: string, message: string): Promise<boolean>;
  sendPush(userId: string, title: string, body: string): Promise<boolean>;
}

export interface ReportProvider {
  generatePdf(templateId: string, data: any): Promise<Buffer>;
  generateCsv(data: any[]): Promise<string>;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface SchedulerProvider {
  scheduleJob(jobId: string, executeAt: Date, payload: any): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
}

export interface WorkerMetrics {
  queueDepth: number;
  retryCount: number;
  dlqCount: number;
  avgProcessingTimeMs: number;
  health: 'HEALTHY' | 'DEGRADED' | 'DOWN';
}

export interface BackgroundWorker<T> {
  process(job: T): Promise<void>;
  handleError(job: T, error: Error): Promise<void>;
  getMetrics(): Promise<WorkerMetrics>;
}
