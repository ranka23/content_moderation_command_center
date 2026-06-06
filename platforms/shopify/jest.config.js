module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.(js|jsx)'],
  transform: {
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$':
      '<rootDir>/../../packages/cmcc-ui/src/__mocks__/styleMock.js',
    '^@cmcc/ui$': '<rootDir>/__mocks__/cmcc-ui.jsx',
    '^@cmcc/core$': '<rootDir>/__mocks__/cmcc-core.js',
  },
}
