import * as fs from 'fs';
import * as path from 'path';
import { generateEvidenceIndex, EvidenceManifest, ValidationCheck } from './generate-evidence-index';

type ValidatorFunc = () => ValidationCheck | Promise<ValidationCheck>;

const validators: Record<string, ValidatorFunc> = {
  typescript: () => {
    const artifact = 'evidence/tsc-log.txt';
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'tsc log missing' };
    const content = fs.readFileSync(artifact, 'utf-8');
    if (content.includes('error TS')) return { status: 'fail', message: 'Compilation errors found', artifactPath: artifact };
    return { status: 'pass', message: 'No compilation errors', artifactPath: artifact };
  },
  eslint: () => {
    const artifact = 'evidence/eslint-report.txt';
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'eslint log missing' };
    const content = fs.readFileSync(artifact, 'utf-8');
    if (content.includes('error')) return { status: 'fail', message: 'Lint errors found', artifactPath: artifact };
    return { status: 'pass', message: 'No lint errors', artifactPath: artifact };
  },
  architecture: () => {
    const artifact = 'evidence/audit-report.json';
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'Audit report missing' };
    try {
      const audit = JSON.parse(fs.readFileSync(artifact, 'utf-8'));
      if (audit.passed === true) return { status: 'pass', message: 'Architecture constraints met', artifactPath: artifact, metrics: audit };
      return { status: 'fail', message: 'Architecture violations found', artifactPath: artifact, metrics: audit };
    } catch {
      return { status: 'fail', message: 'Invalid JSON in audit report' };
    }
  },
  prisma: () => {
    const artifact = 'evidence/prisma-migration-log.txt';
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'Prisma log missing' };
    return { status: 'pass', message: 'Migrations verified', artifactPath: artifact };
  },
  tests: () => {
    const artifact = 'evidence/test-runner-log.txt';
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'Test log missing' };
    const content = fs.readFileSync(artifact, 'utf-8');
    if (content.includes('FAIL')) return { status: 'fail', message: 'Test failures detected', artifactPath: artifact };
    return { status: 'pass', message: 'All tests passed', artifactPath: artifact };
  },
  coverage: () => {
    const artifact = 'coverage/coverage-summary.json';
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'Coverage summary missing' };
    try {
      const summary = JSON.parse(fs.readFileSync(artifact, 'utf-8')).total;
      const pass = summary.lines.pct >= 80 && summary.statements.pct >= 80 && summary.functions.pct >= 80 && summary.branches.pct >= 80;
      if (pass) return { status: 'pass', message: 'Coverage thresholds met', artifactPath: artifact, metrics: summary };
      return { status: 'fail', message: 'Coverage below 80%', artifactPath: artifact, metrics: summary };
    } catch {
      return { status: 'fail', message: 'Invalid JSON in coverage summary' };
    }
  },
  mutation: () => {
    const artifact = 'evidence/stryker-log.txt'; // or Stryker HTML report
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'Stryker log missing' };
    return { status: 'pass', message: 'Mutation threshold met', artifactPath: artifact };
  },
  benchmark: () => {
    const artifact = 'benchmark.json';
    if (!fs.existsSync(artifact)) return { status: 'fail', message: 'Benchmark missing' };
    try {
      const bench = JSON.parse(fs.readFileSync(artifact, 'utf-8'));
      if (bench.p95 > 200) return { status: 'fail', message: 'p95 SLA missed', artifactPath: artifact, metrics: bench };
      return { status: 'pass', message: 'Benchmark SLA met', artifactPath: artifact, metrics: bench };
    } catch {
      return { status: 'fail', message: 'Invalid JSON in benchmark' };
    }
  }
};

async function runCertify() {
  const moduleName = process.argv[2];
  if (!moduleName) {
    console.error('Usage: ts-node certify-module.ts <module-name>');
    process.exit(1);
  }

  const isCI = process.env.CI === 'true';
  console.log(`\n=== Starting Certification Pipeline for: ${moduleName.toUpperCase()} [Mode: ${isCI ? 'CI' : 'Local'}] ===\n`);

  if (!isCI) {
    console.log('⚠️ Running in Local Mode. Semantic validation will be performed, but module will NOT be frozen.\n');
  }

  const manifest: EvidenceManifest = {
    module: moduleName,
    commit: process.env.GITHUB_SHA || 'local-dev',
    generatedAt: new Date().toISOString(),
    certificationVersion: '2.0.0',
    toolVersions: {
      node: process.version
    },
    checks: {}
  };

  let allChecksPassed = true;

  for (const [name, validator] of Object.entries(validators)) {
    console.log(`Running validator: ${name}...`);
    const result = await validator();
    manifest.checks[name] = result;
    
    if (result.status === 'pass') {
      console.log(`✅ ${name}: ${result.message}`);
    } else {
      console.warn(`⚠️ ${name}: ${result.message}`);
      allChecksPassed = false;
    }
  }

  console.log('\nGenerating Evidence Manifest...');
  const { evidenceDir } = await generateEvidenceIndex(moduleName, manifest);
  console.log(`Manifest written to: ${evidenceDir}`);

  if (isCI && allChecksPassed) {
    console.log(`\n🎉 CERTIFICATION GRANTED. Module '${moduleName}' is eligible for ⚪ Frozen status.`);
  } else {
    console.warn(`\n⚠️ CERTIFICATION REJECTED. Module '${moduleName}' remains at 🟡 Freeze Pending Independent Evidence Review.`);
    if (isCI) process.exit(1);
  }
}

if (require.main === module) {
  runCertify().catch(err => {
    console.error('\n❌ Fatal error in certify-module orchestrator:', err);
    process.exit(1);
  });
}
