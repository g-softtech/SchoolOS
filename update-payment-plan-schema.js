const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Rename InstallmentPlan -> PaymentPlan
schema = schema.replace(/model InstallmentPlan \{/g, 'model PaymentPlan {');
schema = schema.replace(/finance_installment_plans/g, 'finance_payment_plans');
schema = schema.replace(/plan\s+InstallmentPlan\s+@relation/g, 'plan            PaymentPlan     @relation');

// Rename InstallmentSchedule -> PaymentSchedule
schema = schema.replace(/model InstallmentSchedule \{/g, 'model PaymentSchedule {');
schema = schema.replace(/finance_installment_schedules/g, 'finance_payment_schedules');
schema = schema.replace(/schedules\s+InstallmentSchedule\[\]/g, 'schedules PaymentSchedule[]');

// Rename InstallmentPlanVersion -> PaymentPlanVersion
schema = schema.replace(/model InstallmentPlanVersion \{/g, 'model PaymentPlanVersion {');
schema = schema.replace(/finance_installment_plan_versions/g, 'finance_payment_plan_versions');
schema = schema.replace(/installmentPlanId\s+String/g, 'paymentPlanId   String');
schema = schema.replace(/installmentPlan\s+InstallmentPlan/g, 'paymentPlan     PaymentPlan');
schema = schema.replace(/\[tenantId, installmentPlanId\]/g, '[tenantId, paymentPlanId]');
schema = schema.replace(/versions\s+InstallmentPlanVersion\[\]/g, 'versions PaymentPlanVersion[]');

// Update Tenant relations
schema = schema.replace(/installmentVersions\s+InstallmentPlanVersion\[\]/g, 'paymentPlanVersions PaymentPlanVersion[]');

// Update Invoice relations
schema = schema.replace(/plans\s+InstallmentPlan\[\]/g, 'plans PaymentPlan[]');

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema successfully updated for PaymentPlanEngine.');
