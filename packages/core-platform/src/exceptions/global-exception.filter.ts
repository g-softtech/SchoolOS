import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { DomainException } from './domain.exception';
import { randomUUID } from 'crypto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Always attach a correlation ID (either from request context, headers, or generated)
    const correlationId = (request.headers['x-correlation-id'] as string) || randomUUID();

    if (exception instanceof DomainException) {
      return response.status(exception.getStatus()).json({
        success: false,
        error: {
          code: exception.code,
          reason: exception.reason,
          correlationId,
          timestamp: new Date().toISOString(),
          domain: exception.domain,
          ...(exception.constructor.name === 'AuthorizationException' 
                ? { 
                    policyVersion: (exception as any).policyVersion, 
                    capabilityVersion: (exception as any).capabilityVersion 
                  } 
                : {}),
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse() as any;
      
      return response.status(status).json({
        success: false,
        error: {
          code: 'HTTP_ERROR',
          reason: typeof res === 'string' ? res : res.message || exception.message,
          correlationId,
          timestamp: new Date().toISOString(),
          domain: 'PLATFORM',
        },
      });
    }

    // Unhandled Exceptions
    console.error('Unhandled Exception:', exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        reason: 'An unexpected error occurred.',
        correlationId,
        timestamp: new Date().toISOString(),
        domain: 'PLATFORM',
      },
    });
  }
}
