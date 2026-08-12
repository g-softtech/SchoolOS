#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const modulesPath = path.join(process.cwd(), 'apps', 'api-gateway', 'src', 'modules');
if (!fs.existsSync(modulesPath)) {
  console.log("No modules found to validate.");
  process.exit(0);
}

const requiredDocs = [
  'REQUIREMENTS.md',
  'DATABASE_DESIGN.md',
  'API_SPEC.md',
  'TEST_PLAN.md',
  'README.md'
];

const modules = fs.readdirSync(modulesPath).filter(m => fs.statSync(path.join(modulesPath, m)).isDirectory());

let failed = false;

modules.forEach(mod => {
  const modDocsPath = path.join(modulesPath, mod, 'docs');
  
  if (!fs.existsSync(modDocsPath)) {
    console.error(`❌ Module '${mod}' is missing the 'docs' directory.`);
    failed = true;
    return;
  }
  
  // We simulate checking inside 'docs' and the root of the module
  requiredDocs.forEach(doc => {
    // In our specific case, the user often stores module-level docs at the root of the module (e.g. README.md)
    // or inside 'docs/'.
    const hasDoc = fs.existsSync(path.join(modulesPath, mod, doc)) || fs.existsSync(path.join(modDocsPath, doc));
    if (!hasDoc) {
      console.error(`❌ Module '${mod}' is missing documentation: ${doc}`);
      failed = true;
    }
  });
});

if (failed) {
  console.error("\nDocumentation Certification FAILED. All modules must have the required architectural documents.");
  process.exit(1);
} else {
  console.log("Documentation Certification PASSED.");
  process.exit(0);
}
