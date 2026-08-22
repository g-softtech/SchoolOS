require('dotenv').config({ path: '../../.env' });
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Successfully connected to Prisma.');
    const count = await prisma.tenant.count();
    console.log('Tenant count:', count);
  } catch (err) {
    console.error('Prisma connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
