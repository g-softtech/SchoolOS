export interface PlatformLogContext {
  CorrelationId: string;
  TenantId: string;
  ActorId: string;
  AggregateId: string;
  CommandId?: string;
  EventId?: string;
  DurationMs: number;
  
  // Distributed Tracing / Operations
  TraceId?: string;
  SpanId?: string;
  WorkerId?: string;
  ProjectionName?: string;
}

export interface ILogger {
  info(message: string, context: PlatformLogContext): void;
  error(message: string, error: Error, context: PlatformLogContext): void;
  warn(message: string, context: PlatformLogContext): void;
  debug(message: string, context: PlatformLogContext): void;
}
