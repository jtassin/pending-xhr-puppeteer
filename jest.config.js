module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
};
