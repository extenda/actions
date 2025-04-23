const mockFs = require('mock-fs');
const core = require('@actions/core');
const getBundleName = require('../src/bundle-name');

jest.mock('@actions/core');

afterAll(() => {
  mockFs.restore();
});

afterEach(() => {
  jest.clearAllMocks();
});

test('It can use provided input', () => {
  core.getInput.mockReturnValueOnce('tst').mockReturnValueOnce('test-system');
  expect(getBundleName()).toEqual('tst.test-system-staging.tar.gz');
});

test('It can use provided input (including environment)', () => {
  core.getInput
    .mockReturnValueOnce('tst')
    .mockReturnValueOnce('test-system')
    .mockReturnValueOnce('prod');
  expect(getBundleName()).toEqual('tst.test-system-prod.tar.gz');
});

test('It fails if cloud-deploy and input is missing', () => {
  mockFs({});
  core.getInput.mockReturnValueOnce('tst').mockReturnValueOnce('');

  expect(() => getBundleName()).toThrow(
    new Error('Not found: cloud-deploy.yaml'),
  );

  core.getInput.mockReturnValueOnce('').mockReturnValueOnce('system-name');
  expect(() => getBundleName()).toThrow(
    new Error('Not found: cloud-deploy.yaml'),
  );
});

test('It can read values from cloud-deploy.yaml', () => {
  mockFs({
    'cloud-deploy.yaml': `
cloud-run:
  service: yaml-service
security:
  permission-prefix: yml
`,
  });

  core.getInput.mockReturnValue('');
  expect(getBundleName()).toEqual('yml.yaml-service-staging.tar.gz');
});

test('It can read values from kubernetes cloud-deploy.yaml', () => {
  mockFs({
    'cloud-deploy.yaml': `
kubernetes:
  service: yaml-service
security:
  permission-prefix: yml
`,
  });

  core.getInput.mockReturnValue('');
  expect(getBundleName()).toEqual('yml.yaml-service-staging.tar.gz');
});
