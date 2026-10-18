module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\\.[tj]sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/src/test/styleMock.cjs',
    '^.*shared/config$': '<rootDir>/src/test/config.ts',
    '^@idx/contracts$': '<rootDir>/../packages/contracts/src/index.ts',
  },
  clearMocks: true,
};
