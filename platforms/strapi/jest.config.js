module.exports = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      roots: ['<rootDir>/server'],
      testMatch: ['**/__tests__/**/*.test.(js|jsx)'],
      moduleNameMapper: {
        '^@cmcc/server-core$':
          '<rootDir>/../../packages/cmcc-server-core/dist/index.js',
      },
    },
    {
      displayName: 'admin',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/admin'],
      testMatch: ['**/__tests__/**/*.test.(js|jsx)'],
      transform: {
        '^.+.(js|jsx)$': [
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
        '.(css|less|scss)$':
          '<rootDir>/../../packages/cmcc-ui/src/__mocks__/styleMock.js',
        '^@cmcc/ui$':
          '<rootDir>/../../platforms/wordpress/__mocks__/cmcc-ui.jsx',
        '^@cmcc/core$':
          '<rootDir>/../../platforms/wordpress/__mocks__/cmcc-core.js',
      },
    },
  ],
}
