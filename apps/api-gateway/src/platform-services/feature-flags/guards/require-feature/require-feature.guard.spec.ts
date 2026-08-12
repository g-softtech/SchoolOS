import { RequireFeatureGuard } from './require-feature.guard';

describe('RequireFeatureGuard', () => {
  it('should be defined', () => {
    expect(new RequireFeatureGuard(null as any, null as any)).toBeDefined();
  });
});
