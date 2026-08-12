import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    // Extract or generate trace IDs
    const requestId = request.headers['x-request-id'] || uuidv4();
    const tenantId = request.headers['x-tenant-id'] || 'unknown-tenant';
    
    // Attach to request for downstream services
    request.requestId = requestId;
    
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - now;
        
        // Structured Logging
        this.logger.log({
          message: `${method} ${url} ${statusCode} - ${duration}ms`,
          requestId,
          tenantId,
          method,
          url,
          statusCode,
          durationMs: duration
        });
      }),
    );
  }
}
