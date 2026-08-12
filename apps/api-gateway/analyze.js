const fs = require('fs');
const log = fs.readFileSync('build_errors.log', 'utf16le');
const lines = log.split('\n');

const errors = [];
let currentError = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\x1B\[\d+m/g, '').replace(/\r$/, '');
  const match = line.match(/(src\/.*?):(\d+):(\d+) - error (TS\d+): (.*)$/);
  if (match) {
    if (currentError) errors.push(currentError);
    currentError = {
      file: match[1],
      code: match[4],
      message: match[5].trim(),
      details: ''
    };
  } else if (currentError && lines[i].trim() !== '') {
    if (currentError.details.length < 500) {
      currentError.details += lines[i].trim() + '\n';
    }
  }
}
if (currentError) errors.push(currentError);

const categories = {};
errors.forEach(e => {
  let cat = 'Misc';
  let cause = 'Individual fix';
  
  if (e.message.includes('Object literal may only specify known properties')) {
    cat = 'Strict Prisma Payload Mismatch';
    cause = 'Generated client/schema mismatch or nested data object required';
  } else if (e.message.includes('does not exist on type') && e.message.includes('PrismaService')) {
    cat = 'Missing Prisma Model Properties';
    cause = 'Generated client missing tables (Policy, SuperAdminOverride)';
  } else if (e.message.includes('does not exist on type')) {
    cat = 'DTO / Interface Mismatch';
    cause = 'Stale interfaces or mismatched return types';
  } else if (e.message.includes('Cannot find module') && e.message.includes('@core/')) {
    cat = 'Stale Import Aliases';
    cause = 'Old @core/* paths instead of @saas/core-platform';
  } else if (e.message.includes('Cannot find module')) {
    cat = 'Missing Module/Alias';
    cause = 'Incorrect import path';
  } else if (e.message.includes('Expected 1 arguments, but got 2')) {
    cat = 'EventBus Signature Mismatch';
    cause = 'publish() takes 1 param instead of (event, payload)';
  } else if (e.message.includes('is not assignable to parameter of type')) {
    cat = 'Type Assignment Error';
    cause = 'Nullability or type mismatch';
  } else if (e.message.includes("implicitly has an 'any' type")) {
    cat = 'Implicit Any Type';
    cause = 'Missing typings in function signatures';
  } else if (e.message.includes("A type referenced in a decorated signature must be imported with 'import type'")) {
    cat = 'emitDecoratorMetadata Mismatch';
    cause = 'Express Request or Cache injected without type import';
  }

  if (!categories[cat]) categories[cat] = { count: 0, cause, examples: [], sampleError: e };
  categories[cat].count++;
  if (categories[cat].examples.length < 3) categories[cat].examples.push(e.file);
});

console.log(JSON.stringify(categories, null, 2));
