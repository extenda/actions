const path = require('path');

module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'lcov',
    'text',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  displayName: 'test',
  reporters: [
    'default',
    [
      'jest-sonar',
      {
        outputDirectory: 'test-results/',
        outputName: 'SONAR-report.xml',
      },
    ],
  ],
  rootDir: process.cwd(),
  testEnvironment: 'node',
};
