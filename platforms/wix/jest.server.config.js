module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {},
  moduleNameMapper: {
    '^@cmcc/server-core$': '<rootDir>/server/__mocks__/@cmcc/server-core.js',
  },
  maxWorkers: 1,
}
