module.exports = {
  automock: false,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'lcov',
    'text',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  reporters: [
    'default',
    [
      'jest-sonar',
      {
        outputDirectory: 'test-results',
        outputName: 'sonar-report.xml',
      },
    ],
  ],
  rootDir: process.cwd(),
  testEnvironment: 'node',
  maxWorkers: '50%',
  setupFiles: ['./jest.setup.js'],
};
