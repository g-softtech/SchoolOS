#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // grep -rEI 'TODO|FIXME' apps packages
  const output = execSync('grep -rEI "TODO|FIXME" apps packages --exclude-dir=node_modules || true', { encoding: 'utf8' });
  
  if (output.trim()) {
    console.error("❌ Found TODO or FIXME comments in the codebase:");
    console.error(output);
    console.error("Please resolve them before freezing.");
    process.exit(1);
  } else {
    console.log("✅ No TODO/FIXME found.");
    process.exit(0);
  }
} catch (error) {
  console.error("Error executing search.");
  process.exit(1);
}
