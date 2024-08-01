const mockFs = require('mock-fs');
const { exec } = require('@actions/exec');
const { execGcloud } = require('../../setup-gcloud');
const createTestBundle = require('../src/create-test-bundle');
const copyPolicies = require('../src/copy-policies');

jest.mock('@actions/exec');
jest.mock('../../setup-gcloud');
jest.mock('../src/copy-policies');

afterAll(() => {
  mockFs.restore();
});

beforeEach(() => {
  mockFs({
    policies: {
      policy: {
        'com.styra.envoy.ingress': {
          'rules/rules/ingress.rego': 'ingress',
          'test/test/test.rego': '',
        },
      },
    },
    'test-bundle': {
      'bundle.tar.gz': 'binary',
    },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('It can create a test bundle', async () => {
  execGcloud.mockResolvedValueOnce('');
  exec.mockResolvedValueOnce(1);

  const bundleName = await createTestBundle(
    'tst.test-system-staging.tar.gz',
    'authz-bundles/systems',
  );

  expect(bundleName).toEqual('test-bundle');
  expect(execGcloud).toHaveBeenCalledWith([
    'storage',
    'cp',
    'gs://authz-bundles/systems/tst.test-system-staging.tar.gz',
    'test-bundle/bundle.tar.gz',
  ]);
  expect(exec).toHaveBeenCalledWith('tar', [
    '-xf',
    'test-bundle/bundle.tar.gz',
    '-C',
    'test-bundle',
  ]);
  expect(copyPolicies).toHaveBeenCalledWith('test-bundle');
});

test('It fails if bundle does not exist', async () => {
  execGcloud.mockRejectedValueOnce(new Error('TEST'));
  await expect(() =>
    createTestBundle('tst.test-system-staging.tar.gz', 'authz-bundles/systems'),
  ).rejects.toThrow();
});
