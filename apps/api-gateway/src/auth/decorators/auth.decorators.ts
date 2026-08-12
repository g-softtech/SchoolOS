import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';
export const RequirePermission = (...permissions: string[]) => SetMetadata(REQUIRE_PERMISSION_KEY, permissions);

export const REQUIRE_MARKETPLACE_APP_KEY = 'require_marketplace_app';
export const RequireMarketplaceApp = (appCode: string) => SetMetadata(REQUIRE_MARKETPLACE_APP_KEY, appCode);

export const REQUIRE_POLICY_KEY = 'require_policy';
export const RequirePolicy = (policyName: string) => SetMetadata(REQUIRE_POLICY_KEY, policyName);
