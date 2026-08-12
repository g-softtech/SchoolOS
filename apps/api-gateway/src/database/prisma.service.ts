import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient, tenantContextStorage } from '@saas/core-platform';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  // Robust Client Extension preventing data leaks across Read, Write, and Upsert operations.
  get tenantClient() {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const globalModels = ['Tenant'];
            if (globalModels.includes(model)) {
              return query(args); // Bypass isolation for global models
            }

            const store = tenantContextStorage.getStore();
            const tenantId = store?.tenantId;
            
            if (!tenantId) {
              throw new InternalServerErrorException(`CRITICAL: Attempted to query ${model} without a Tenant Context.`);
            }

            const newArgs = { ...args } as any;

            // 1. Intercept Reads
            if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              newArgs.where = { ...newArgs.where, tenantId };
            }
            // Prisma findUnique requires unique indexes. Override to findFirst to allow tenantId scoping.
            if (operation === 'findUnique') {
              operation = 'findFirst' as any;
              newArgs.where = { ...newArgs.where, tenantId };
            }
            if (operation === 'findUniqueOrThrow') {
              operation = 'findFirstOrThrow' as any;
              newArgs.where = { ...newArgs.where, tenantId };
            }

            // 2. Intercept Writes (Creates)
            if (['create', 'createMany'].includes(operation)) {
              if (Array.isArray(newArgs.data)) {
                newArgs.data = newArgs.data.map((d: any) => ({ ...d, tenantId }));
              } else {
                newArgs.data = { ...newArgs.data, tenantId };
              }
            }

            // 3. Intercept Updates & Deletes
            if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
              // Scoping the where clause ensures we ONLY update/delete rows belonging to this tenant.
              newArgs.where = { ...newArgs.where, tenantId };
            }

            // 4. Intercept Upserts
            if (operation === 'upsert') {
              newArgs.where = { ...newArgs.where, tenantId };
              newArgs.create = { ...newArgs.create, tenantId };
              // update payload remains untouched; restricted by the where scope.
            }

            return query(newArgs);
          },
        },
      },
    });
  }
}
