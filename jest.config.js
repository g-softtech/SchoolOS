module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverageFrom: [
    'apps/api-gateway/src/modules/students/**/*.(t|j)s',
    '!apps/api-gateway/src/modules/students/**/*.module.(t|j)s',
    '!apps/api-gateway/src/modules/students/dto/**/*.(t|j)s'
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json-summary', 'text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/packages/core-platform/src/$1',
    '^@prisma/client$': '<rootDir>/packages/core-platform/node_modules/@prisma/client'
  },
};
