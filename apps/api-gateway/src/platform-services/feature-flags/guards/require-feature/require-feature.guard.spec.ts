import { RequireFeatureGuard } from './require-feature.guard';

describe('RequireFeatureGuard', () => {
  it('should be defined', () => {
    expect(new RequireFeatureGuard()).toBeDefined();
  });
});
