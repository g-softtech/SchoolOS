import * as fs from 'fs';
import * as path from 'path';

interface ArchitectureRule {
  match: string;
  forbidden: string[];
  requiredDecorators: string[];
}

interface Rules {
  [layer: string]: ArchitectureRule;
}

const RULES_PATH = path.join(__dirname, 'architecture', 'rules.json');

export async function auditArchitecture(moduleName: string): Promise<{ passed: boolean; errors: string[] }> {
  const rules: Rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
  const moduleDir = path.join(process.cwd(), 'apps', 'api-gateway', 'src', 'modules', moduleName);

  if (!fs.existsSync(moduleDir)) {
    return { passed: false, errors: [`Module directory not found: ${moduleDir}`] };
  }

  const errors: string[] = [];

  const walkSync = (dir: string, filelist: string[] = []): string[] => {
    fs.readdirSync(dir).forEach(file => {
      const dirFile = path.join(dir, file);
      try {
        filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
      } catch (err) {
        if (err.code === 'ENOENT') {
          // ignore
        } else {
          throw err;
        }
      }
    });
    return filelist;
  };

  const files = walkSync(moduleDir);

  for (const [layer, rule] of Object.entries(rules)) {
    const extMatch = rule.match.replace('*', '');
    const layerFiles = files.filter(f => f.endsWith(extMatch));

    for (const file of layerFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check forbidden imports/dependencies
      for (const forbidden of rule.forbidden) {
        if (content.includes(forbidden)) {
          errors.push(`[${layer} Violation] File ${path.basename(file)} contains forbidden dependency: ${forbidden}`);
        }
      }

      // Check required decorators
      for (const decorator of rule.requiredDecorators) {
        if (!content.includes(decorator)) {
          errors.push(`[${layer} Violation] File ${path.basename(file)} is missing required decorator: ${decorator}`);
        }
      }

      // Check for technical debt
      if (content.match(/(TODO|FIXME|HACK)/i)) {
        errors.push(`[Technical Debt] File ${path.basename(file)} contains TODO/FIXME/HACK markers.`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

// Allow running directly
if (require.main === module) {
  const moduleName = process.argv[2];
  if (!moduleName) {
    console.error('Usage: ts-node audit-architecture.ts <module-name>');
    process.exit(1);
  }

  auditArchitecture(moduleName).then(result => {
    if (!result.passed) {
      console.error('Architecture Audit Failed:');
      result.errors.forEach(err => console.error(err));
      process.exit(1);
    }
    console.log('Architecture Audit Passed!');
  });
}
