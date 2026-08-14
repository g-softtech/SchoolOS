import { PrismaClient } from '@saas/core-platform';
process.env.DATABASE_URL="postgresql://neondb_owner:npg_nFY3EulQZ6dc@ep-weathered-credit-aqlu1kv0.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30&connection_limit=3&pool_timeout=60&schema=schoolos_test";

async function killIdleConnections() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    // Kill all connections except our own
    await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
        AND pid <> pg_backend_pid()
        AND state IN ('idle', 'idle in transaction');
    `);
    console.log('Successfully terminated idle connections');
  } catch (err) {
    console.error('Failed to terminate connections:', err);
  } finally {
    await prisma.$disconnect();
  }
}

killIdleConnections();
