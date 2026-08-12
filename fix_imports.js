const fs = require('fs');
const files = [
  'apps/api-gateway/src/modules/students/tests/student.service.spec.ts',
  'apps/api-gateway/src/modules/students/tests/student-lifecycle.service.spec.ts',
  'apps/api-gateway/src/modules/students/subscribers/admission-enrolled.subscriber.ts',
  'apps/api-gateway/src/modules/students/services/student.service.ts',
  'apps/api-gateway/src/modules/students/services/student-lifecycle.service.ts',
  'apps/api-gateway/src/modules/students/services/guardian.service.ts',
  'apps/api-gateway/src/modules/students/tests/student.repository.spec.ts',
  'apps/api-gateway/src/modules/students/repositories/student.repository.ts'
];
files.forEach(f => {
  if(fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/'@core\/events\/platform-event-bus'/g, "'@saas/core-platform'");
    content = content.replace(/'@core\/prisma\/prisma\.service'/g, "'@saas/core-platform'");
    fs.writeFileSync(f, content);
  }
});
console.log('Fixed imports');
