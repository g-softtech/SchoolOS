const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.$connect().then(() => { 
  console.log('Connected!'); 
  prisma.$disconnect(); 
}).catch(e => console.error(e));
