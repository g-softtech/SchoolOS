import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [FeatureFlagsService],
    }, PrismaService).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
