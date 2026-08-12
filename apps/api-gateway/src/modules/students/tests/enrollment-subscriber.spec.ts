import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentSubscriber } from '../subscribers/enrollment.subscriber';
import { PlatformEventBus } from '@saas/core-platform';

describe('EnrollmentSubscriber', () => {
  let subscriber: EnrollmentSubscriber;
  let eventBus: jest.Mocked<PlatformEventBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentSubscriber,
        {
          provide: PlatformEventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    subscriber = module.get<EnrollmentSubscriber>(EnrollmentSubscriber);
    eventBus = module.get(PlatformEventBus);
  });

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });
});
