import { Module, Global } from '@nestjs/common';
import { CorePlatformModule } from '@saas/core-platform';
import { AuthModule } from '../../auth/auth.module';
// Repositories
import { RoleRepository } from './repositories/role.repository';
import { SessionRepository } from './repositories/session.repository';
import { TenantMembershipRepository } from './repositories/tenant-membership.repository';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
// Services
import { AuthenticationService } from './services/authentication.service';
import { PasswordService } from './services/password.service';
import { RegistrationService } from './services/registration.service';
import { RoleService } from './services/role.service';
import { SessionService } from './services/session.service';
import { TenantService } from './services/tenant.service';
import { WorkspaceService } from './services/workspace.service';
import { IdentityProvisioningService } from './services/identity-provisioning.service';
// Security & Interceptors & Subscribers
import { PoliciesGuard } from './security/policies.guard';
import { WorkspaceContextInterceptor } from './interceptors/workspace-context.interceptor';
import { AnalyticsSubscriber } from './subscribers/analytics.subscriber';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { CacheInvalidationSubscriber } from './subscribers/cache-invalidation.subscriber';
// Controllers
import { TenantWizardController } from './controllers/tenant-wizard.controller';

@Global()
@Module({
  imports: [CorePlatformModule, AuthModule],
  controllers: [TenantWizardController],
  providers: [
    RoleRepository,
    SessionRepository,
    TenantMembershipRepository,
    TenantRepository,
    UserRepository,
    AuthenticationService,
    PasswordService,
    RegistrationService,
    RoleService,
    SessionService,
    TenantService,
    WorkspaceService,
    IdentityProvisioningService,
    PoliciesGuard,
    WorkspaceContextInterceptor,
    AnalyticsSubscriber,
    AuditSubscriber,
    CacheInvalidationSubscriber,
  ],
  exports: [
    RoleRepository,
    SessionRepository,
    TenantMembershipRepository,
    TenantRepository,
    UserRepository,
    AuthenticationService,
    PasswordService,
    RegistrationService,
    RoleService,
    SessionService,
    TenantService,
    WorkspaceService,
    IdentityProvisioningService,
    PoliciesGuard,
    WorkspaceContextInterceptor,
  ],
})
export class IdentityModule {}
