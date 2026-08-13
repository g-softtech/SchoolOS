# Module Wiring Repairs Log

## 1. `CorePlatformModule` duplicate Prisma client
**Symptom**: `PrismaClientInitializationError: Timed out fetching a new connection from the connection pool.`
**Cause**: The E2E test imported `CorePlatformModule` directly alongside `DatabaseModule`. Because both define their own Prisma service connections, this led to duplicate connections flooding the PostgreSQL pool.
**Fix**: Restored `DatabaseModule` as the authoritative provider. Used an alias provider inside the test suite:
`{ provide: PrismaClient, useExisting: PrismaService }` to ensure `EventDispatcher` gets the isolated `PrismaService`.

## 2. `PolicyModule` dependencies in `AuthModule`
**Symptom**: `PolicyService` failing to resolve dependencies during E2E TestingModule compilation.
**Cause**: The test suite `website-outbox-e2e.spec.ts` initialized `AuthModule` which depended on `PolicyService`, but the real `PolicyModule` was missing from `AuthModule` imports.
**Fix**: Added `PolicyModule` directly to the `imports` array of `AuthModule` to represent the legitimate architectural module boundary rather than just fixing it for the E2E test.

## 3. UI Package Missing Source (`web-app`)
**Symptom**: `Module '"@saas/ui"' has no exported member 'Card'.`
**Cause**: The `@saas/ui` library had an empty/missing `src/` directory while `web-app` imported components from it.
**Fix**: Bootstrapped the UI package with `index.tsx`, updated `package.json` entry points, and added `transpilePackages: ["@saas/ui"]` to `next.config.mjs`.

## 4. NextAuth Type Augmentation
**Symptom**: `Property 'accessToken' does not exist on type 'User | AdapterUser'.`
**Cause**: The NextAuth configuration added custom properties to the JWT token but the User model was not explicitly typed.
**Fix**: Added `declare module "next-auth"` interface extensions inside `auth.ts`.
