import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { WebsiteService } from '../services/website.service';
import { WebsiteRepository } from '../repositories/website.repository';
import { OutboxService } from '@saas/core-platform';
import { NotFoundException } from '@nestjs/common';

describe('WebsiteService Unit', () => {
  let service: WebsiteService;
  let repo: jest.Mocked<WebsiteRepository>;
  let outboxService: jest.Mocked<OutboxService>;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [WebsiteService, WebsiteRepository, OutboxService]
    }, PrismaService).compile();

    service = module.get<WebsiteService>(WebsiteService);
    repo = module.get(WebsiteRepository);
    outboxService = module.get(OutboxService);

    // Mock the transaction method
    repo.transaction = jest.fn().mockImplementation(async (cb) => {
      return cb({ ...repo, prisma: {} });
    });
  });

  it('should rollback transaction and throw NotFoundException if website does not exist', async () => {
    repo.findByTenant.mockResolvedValue(null);
    await expect(service.updateSettings('tenant-1', {})).rejects.toThrow(NotFoundException);
  });

  it('should append Website.ThemeChanged event when themeId is updated', async () => {
    repo.findByTenant.mockResolvedValue({ id: '1', themeId: 'old-theme' } as any);
    repo.update.mockResolvedValue({ id: '1', themeId: 'new-theme' } as any);

    await service.updateSettings('tenant-1', { themeId: 'new-theme' });

    expect(outboxService.appendEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'Website.ThemeChanged' })
    );
  });
});
