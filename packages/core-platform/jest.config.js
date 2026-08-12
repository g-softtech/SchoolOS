module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(t|j)s$': '@swc/jest',
  },
  testTimeout: 60000,
};
