import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { WebsiteController } from '../controllers/website.controller';
import { WebsiteService } from '../services/website.service';
import { UpdateWebsiteSettingsDto } from '../dto/website.dto';

describe('WebsiteController Unit', () => {
  let controller: WebsiteController;
  let service: jest.Mocked<WebsiteService>;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({}, PrismaService).compile();

    controller = module.get<WebsiteController>(WebsiteController);
    service = module.get(WebsiteService);
  });

  it('should delegate updateSettings to WebsiteService with correct tenantId', async () => {
    const dto: UpdateWebsiteSettingsDto = { themeId: '123' };
    await controller.updateSettings('tenant-1', dto);

    expect(service.updateSettings).toHaveBeenCalledWith('tenant-1', dto);
  });
});
