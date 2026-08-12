import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [AuditService],
    }, PrismaService).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
