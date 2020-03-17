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
      'jest-junit',
      {
        outputDirectory: 'test-results/jest',
        outputName: 'TEST-jest.xml',
      },
    ],
  ],
  rootDir: process.cwd(),
  testEnvironment: 'node',
  testResultsProcessor: path.join(__dirname, '.scripts', 'sonar-reporter.js'),
};
