module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/test-helper.js'],
  transform: {},
  moduleNameMapper: {
    '^@cmcc/server-core$': '<rootDir>/../../packages/cmcc-server-core/src/index.ts',
  },
}
