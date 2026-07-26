import { Test, TestingModule } from '@nestjs/testing';
import { LicensingService } from './licensing.service';

describe('LicensingService', () => {
  let service: LicensingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicensingService],
    }).compile();

    service = module.get<LicensingService>(LicensingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
