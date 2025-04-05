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
  moduleNameMapper: {
  "puppeteer-core/internal/puppeteer-core.js": "<rootDir>/node_modules/puppeteer-core/lib/cjs/puppeteer/puppeteer-core.js",
  "puppeteer-core/internal/node/PuppeteerNode.js": "<rootDir>/node_modules/puppeteer-core/lib/cjs/puppeteer/node/PuppeteerNode.js"
}
};
