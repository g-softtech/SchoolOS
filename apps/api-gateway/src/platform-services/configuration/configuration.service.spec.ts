import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [ConfigurationService],
    }, PrismaService).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
