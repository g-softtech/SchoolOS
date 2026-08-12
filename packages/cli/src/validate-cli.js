#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const modulesToTest = ['finance-test', 'students-test', 'library-test', 'transport-test'];
const cliPath = path.join(__dirname, 'index.js');
const modulesDir = path.join(process.cwd(), 'apps', 'api-gateway', 'src', 'modules');

let failed = false;

modulesToTest.forEach(mod => {
  console.log(`Generating module: ${mod}`);
  try {
    execSync(`node ${cliPath} ${mod}`, { stdio: 'inherit' });
    
    // Validate that the generated module has the required directories
    const modPath = path.join(modulesDir, mod);
    if (!fs.existsSync(path.join(modPath, 'domain'))) {
      console.error(`❌ Module ${mod} generation failed: missing domain layer.`);
      failed = true;
    }
    
    // Cleanup after test
    fs.rmSync(modPath, { recursive: true, force: true });
    console.log(`✅ Module ${mod} generated and verified successfully.`);
  } catch (err) {
    console.error(`❌ Failed to generate module ${mod}.`);
    failed = true;
  }
});

if (failed) {
  console.error("\nDX CLI Certification FAILED.");
  process.exit(1);
} else {
  console.log("\nDX CLI Certification PASSED.");
  process.exit(0);
}
