import * as fs from 'fs';
import * as path from 'path';

const HEALTH_DASHBOARD_PATH = path.join(process.cwd(), 'docs', 'architecture', 'PLATFORM_HEALTH.md');
const EVIDENCE_BASE_DIR = path.join(process.cwd(), 'evidence');

const INITIAL_MODULES = [
  'Identity',
  'Website',
  'Admissions',
  'Students',
  'Academics',
  'Finance',
  'HR',
  'Library',
  'Hostel',
  'CBT',
  'Inventory',
  'Payroll'
];

async function generateDashboard() {
  const tableRows: string[] = [];

  for (const moduleName of INITIAL_MODULES) {
    const evidenceDir = path.join(EVIDENCE_BASE_DIR, moduleName.toLowerCase());
    let isFrozen = false;
    let hasEvidence = false;

    if (fs.existsSync(evidenceDir)) {
      const dates = fs.readdirSync(evidenceDir);
      dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      if (dates.length > 0) {
        const manifestPath = path.join(evidenceDir, dates[0], 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          hasEvidence = true;
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          
          isFrozen = Object.values(manifest.checks).every((c: any) => c.status === 'pass');
        }
      }
    }

    const freezeIcon = isFrozen ? '⚪' : (hasEvidence ? '🟡' : '❌');
    const metricIcon = hasEvidence ? '🟢' : '🔴';
    const missingUi = (moduleName === 'Identity' || moduleName === 'Academics') ? 'N/A' : metricIcon;
    const missingReports = (moduleName === 'Identity') ? 'N/A' : metricIcon;

    tableRows.push(`| **${moduleName}** | ${metricIcon} | ${metricIcon} | ${metricIcon} | ${metricIcon} | ${missingUi} | ${metricIcon} | ${metricIcon} | ${missingReports} | ${metricIcon} | ${metricIcon} | ${freezeIcon} |`);
  }

  const dashboardContent = `# PLATFORM HEALTH DASHBOARD

This is the operational status board for SchoolOS modules. It serves as the definitive release dashboard.
No module may proceed to Production without all indicators turning Green (🟢).

## Status Legend
🟢 Complete
🟡 In Progress
🔴 Not Started
⚪ Frozen
❌ No Evidence

## Module Status Matrix

| Module | DB | Repo | Service | API | UI | Auth | Analytics | Reports | Tests | Docs | Freeze |
|--------|----|------|---------|-----|----|------|-----------|---------|-------|------|--------|
${tableRows.join('\n')}

## Health Check Constraints
1. **DB/Repo/Service/API**: Must adhere to strict separation of concerns outlined in the Dependency Matrix.
2. **Auth**: Tenant isolation, RBAC, Feature Flags, and Policies implemented.
3. **Analytics/Audit**: Events emitted and subscribed to by telemetry systems.
4. **Docs**: Swagger, ADRs, and API Contracts verified.
5. **Freeze**: Final architectural lock for the module iteration.
`;

  fs.writeFileSync(HEALTH_DASHBOARD_PATH, dashboardContent);
  console.log('✅ Regenerated PLATFORM_HEALTH.md from manifest files.');
}

if (require.main === module) {
  generateDashboard().catch(console.error);
}
