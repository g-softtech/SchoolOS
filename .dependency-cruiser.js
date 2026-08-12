/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-cannot-import-nestjs',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: { path: '@nestjs/' }
    },
    {
      name: 'domain-cannot-import-prisma',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: { path: '@prisma/client' }
    },
    {
      name: 'domain-cannot-import-express',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: { path: 'express' }
    },
    {
      name: 'application-cannot-import-controllers',
      severity: 'error',
      from: { path: '(^|/)application/' },
      to: { path: '(^|/)controllers/' }
    },
    {
      name: 'controllers-cannot-import-repositories',
      severity: 'error',
      from: { path: '(^|/)controllers/' },
      to: { path: '(^|/)repositories/' }
    },
    {
      name: 'repositories-cannot-import-eventbus',
      severity: 'error',
      from: { path: '(^|/)repositories/' },
      to: { path: '@nestjs/cqrs' }
    },
    {
      name: 'subscribers-cannot-import-controllers',
      severity: 'error',
      from: { path: '(^|/)subscribers/' },
      to: { path: '(^|/)controllers/' }
    },
    {
      name: 'ui-cannot-import-prisma',
      severity: 'error',
      from: { path: '(^|/)apps/web-app/' },
      to: { path: '@prisma/client' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: [
        'npm',
        'npm-dev',
        'npm-optional',
        'npm-peer',
        'npm-bundled',
        'npm-no-pkg',
      ],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
