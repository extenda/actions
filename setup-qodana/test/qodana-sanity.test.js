const fs = require('fs');
const path = require('path');
const { root, createFiles, removeFiles } = require('./test-files');
const {
  projectType: { NODE },
} = require('../src/auto-discover');
const qodanaSanity = require('../src/qodana-sanity');

afterEach(() => {
  removeFiles();
});

test('It generates qodana.yaml if missing', () => {
  createFiles(['README.md']);
  qodanaSanity(NODE, root);
  const qodanaYaml = path.resolve(root, 'qodana.yaml');
  expect(fs.existsSync(qodanaYaml)).toEqual(true);
  expect(fs.readFileSync(qodanaYaml, 'utf-8')).toMatchSnapshot();
});

describe('Quality Gate validation', () => {
  test('Valid qodana.yaml', () => {
    createFiles(['qodana.yaml']);
    fs.writeFileSync(
      path.resolve(root, 'qodana.yaml'),
      `
version: '1.0'
ide: QDJS
profile:
  name: qodana.recommended
failureConditions:
  severityThresholds:
    critical: 0
    high: 0
    moderate: 0
  testCoverageThresholds:
    fresh: 80
    total: 50
    `,
      'utf-8',
    );
    expect(qodanaSanity(NODE, root)).toEqual(true);
  });
  test('No critical issues allowed', () => {
    createFiles(['qodana.yaml']);
    fs.writeFileSync(
      path.resolve(root, 'qodana.yaml'),
      `
version: '1.0'
ide: QDJVM
profile:
  name: qodana.recommended
failureConditions:
  severityThresholds:
    critical: 5
    high: 0
    moderate: 0
  testCoverageThresholds:
    fresh: 80
    total: 50
    `,
      'utf-8',
    );
    expect(qodanaSanity(NODE, root)).toEqual(false);
  });
  test('It requires 80 fresh code coverage', () => {
    createFiles(['qodana.yaml']);
    fs.writeFileSync(
      path.resolve(root, 'qodana.yaml'),
      `
version: '1.0'
ide: QDJVM
profile:
  name: qodana.recommended
failureConditions:
  severityThresholds:
    critical: 0
    high: 0
    moderate: 0
  testCoverageThresholds:
    fresh: 60
    total: 50
    `,
      'utf-8',
    );
    expect(qodanaSanity(NODE, root)).toEqual(false);
  });
  test('It requires at least 50 total code coverage', () => {
    createFiles(['qodana.yaml']);
    fs.writeFileSync(
      path.resolve(root, 'qodana.yaml'),
      `
version: '1.0'
ide: QDJVM
profile:
  name: qodana.recommended
failureConditions:
  severityThresholds:
    critical: 5
    high: 0
    moderate: 0
  testCoverageThresholds:
    fresh: 80
    `,
      'utf-8',
    );
    expect(qodanaSanity(NODE, root)).toEqual(false);
  });
});
