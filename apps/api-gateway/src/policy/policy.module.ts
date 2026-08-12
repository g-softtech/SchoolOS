import { Module, Global } from '@nestjs/common';
import { PolicyService, PolicyRegistry } from './policy.service';

@Global()
@Module({
  providers: [PolicyService, PolicyRegistry],
  exports: [PolicyService, PolicyRegistry],
})
export class PolicyModule {}
