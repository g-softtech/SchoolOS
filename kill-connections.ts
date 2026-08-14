import { PrismaClient } from './prisma/generated/client';

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
        AND state = 'idle';
    `);
    console.log('Successfully terminated idle connections');
  } catch (err) {
    console.error('Failed to terminate connections:', err);
  } finally {
    await prisma.$disconnect();
  }
}

killIdleConnections();
