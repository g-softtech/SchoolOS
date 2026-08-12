import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FamilyContext } from './FamilyContext';

export const GetFamilyContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): FamilyContext => {
    const request = ctx.switchToHttp().getRequest();
    const familyContext = request.familyContext;
    
    if (!familyContext) {
      throw new UnauthorizedException('FamilyContext is missing. Ensure the FamilyContextInterceptor is applied.');
    }
    
    return familyContext as FamilyContext;
  },
);
