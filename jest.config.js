module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathIgnorePatterns: ['node_modules/', '.history'],
  collectCoverageFrom: ['src/*.{ts}', '!**/node_modules/**', '!**/vendor/**'],
  coverageReporters: ['json', 'html'],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 76,
      lines: 100,
      functions: 100,
    },
  },
};
