import { Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';

@Module({
  providers: [FeatureFlagsService]
})
export class FeatureFlagsModule {}
