module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  collectCoverageFrom: [
    'src/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
};
