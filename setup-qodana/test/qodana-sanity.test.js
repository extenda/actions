const fs = require('fs');
const path = require('path');
const { root, createFiles, removeFiles } = require('./test-files');
const {
  projectType: { NODE },
} = require('../src/auto-discover');
const qodanaSanity = require('../src/qodana-sanity');
const core = require('@actions/core');
const { GENERATED_QODANA_YAML } = require('../src/constants');

jest.mock('@actions/core');

afterEach(() => {
  removeFiles();
});

test('It generates qodana.yaml if missing', () => {
  createFiles(['README.md']);
  const result = qodanaSanity(NODE, root);
  const generated = path.resolve(root, 'qodana_recommended.yaml');
  expect(fs.existsSync(generated)).toEqual(true);
  expect(fs.readFileSync(generated, 'utf-8')).toMatchSnapshot();
  expect(core.saveState).toHaveBeenCalledWith(GENERATED_QODANA_YAML, generated);
  expect(result).toEqual({
    qodanaYamlFile: generated,
    valid: true,
  });
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
    expect(qodanaSanity(NODE, root)).toEqual({
      qodanaYamlFile: path.resolve(root, 'qodana.yaml'),
      valid: true,
    });
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
    expect(qodanaSanity(NODE, root)).toEqual({
      qodanaYamlFile: path.resolve(root, 'qodana.yaml'),
      valid: false,
    });
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
    expect(qodanaSanity(NODE, root)).toEqual({
      qodanaYamlFile: path.resolve(root, 'qodana.yaml'),
      valid: false,
    });
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
    expect(qodanaSanity(NODE, root)).toEqual({
      qodanaYamlFile: path.resolve(root, 'qodana.yaml'),
      valid: false,
    });
  });
});
