import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WorkspaceContext } from '@saas/core-platform';

export const CurrentWorkspace = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): WorkspaceContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspace || request.workspaceContext;
  },
);
