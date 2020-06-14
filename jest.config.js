module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathIgnorePatterns: ['node_modules/', '.history'],
  collectCoverageFrom: ['src/*.{ts}', '!**/node_modules/**', '!**/vendor/**'],
};
