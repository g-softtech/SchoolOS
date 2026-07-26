import { Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit.service';
import { Reflector } from '@nestjs/core';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AuditAction = (action: string, entity: string) => SetMetadata(AUDIT_ACTION_KEY, { action, entity });

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<{ action: string; entity: string }>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;
    const userId = request.user?.id;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap((data) => {
        // Run asynchronously without blocking the response
        this.auditService.logAction({
          tenantId,
          userId,
          action: auditMeta.action,
          entity: auditMeta.entity,
          entityId: data?.id || 'unknown',
          metadata: { body: request.body, query: request.query },
          ipAddress,
          userAgent,
        });
      }),
    );
  }
}
