const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Fix unresolved InstallmentPlan and InstallmentSchedule references
schema = schema.replace(/InstallmentPlan(\s+)InstallmentPlan\[\]/g, 'PaymentPlan$1PaymentPlan[]');
schema = schema.replace(/InstallmentSchedule(\s+)InstallmentSchedule\[\]/g, 'PaymentSchedule$1PaymentSchedule[]');
schema = schema.replace(/InstallmentPlanVersion(\s+)InstallmentPlanVersion\[\]/g, 'PaymentPlanVersion$1PaymentPlanVersion[]');

// Fix the relation argument
schema = schema.replace(/fields: \[installmentPlanId\]/g, 'fields: [paymentPlanId]');

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Fixed remaining schema syntax errors.');
