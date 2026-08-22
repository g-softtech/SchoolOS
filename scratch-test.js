const { PrismaClient } = require('./packages/core-platform/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const tId = 'e2e-test-' + Date.now();
    
    // We need to create a Tenant first!
    const plan = await prisma.platformPlan.findFirst();
    await prisma.tenant.create({
      data: {
        id: tId,
        name: `E2E Att Tenant ${tId}`,
        slug: `e2e-att-t-${tId}`,
        status: 'ACTIVE',
        planId: plan.id,
      }
    });

    const role = await prisma.role.create({ 
      data: { tenantId: tId, name: 'STAFF_'+tId, isSystem: true } 
    });
    
    await prisma.user.create({ 
      data: { 
        email: 'staff-'+tId+'@e2e.com', 
        passwordHash: 'hash', 
        emailVerified: new Date(), 
        memberships: { 
          create: { 
            tenantId: tId, 
            roleId: role.id, 
            state: 'ACTIVE', 
             
            profile: { 
              create: { firstName: 'Staff', lastName: 'User' } 
            } 
          } 
        } 
      } 
    }); 
    console.log('Success'); 
  } catch (e) { 
    console.error('ERROR:', e.message); 
  } finally { 
    await prisma.$disconnect(); 
  }
}
main();
