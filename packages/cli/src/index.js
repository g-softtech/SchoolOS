#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const moduleName = process.argv[2];
if (!moduleName) {
  console.error("Usage: pnpm create-module <module-name>");
  process.exit(1);
}

const basePath = path.join(process.cwd(), 'apps', 'api-gateway', 'src', 'modules', moduleName);

const dirs = [
  'domain/aggregates',
  'domain/entities',
  'domain/value-objects',
  'domain/events',
  'domain/repositories',
  'domain/specifications',
  'application/commands',
  'application/queries',
  'application/handlers',
  'controllers',
  'repositories',
  'dto/create',
  'dto/update',
  'dto/response',
  'dto/query',
  'events',
  'subscribers',
  'widgets',
  'reports',
  'analytics',
  'policies',
  'tests/unit',
  'tests/integration',
  'tests/e2e',
  'docs',
];

fs.mkdirSync(basePath, { recursive: true });

dirs.forEach(dir => {
  fs.mkdirSync(path.join(basePath, dir), { recursive: true });
});

const moduleTs = `import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule],
  controllers: [],
  providers: []
})
export class ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module {}
`;

fs.writeFileSync(path.join(basePath, `${moduleName}.module.ts`), moduleTs);
fs.writeFileSync(path.join(basePath, 'README.md'), `# ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module\n\nGenerated via @saas/cli.`);

console.log(`Successfully scaffolded ${moduleName} module at ${basePath}`);
