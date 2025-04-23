const mockFs = require('mock-fs');
const core = require('@actions/core');
const action = require('../src/index');
const getBundleName = require('../src/bundle-name');
const createTestBundle = require('../src/create-test-bundle');
const opaTest = require('../src/opa-test');
const { setupGcloud } = require('../../setup-gcloud');

jest.mock('@actions/core');
jest.mock('../src/bundle-name');
jest.mock('../src/create-test-bundle');
jest.mock('../src/opa-test');
jest.mock('../../setup-gcloud');

describe('opa-policy-test', () => {
  afterAll(() => {
    mockFs.restore();
  });

  beforeEach(() => {
    mockFs({
      'policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego': '',
      'policies/policy/com.styra.envoy.ingress/test/test/test.rego': '',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It can test an opa bundle', async () => {
    core.getInput
      .mockReturnValueOnce('test-sa')
      .mockReturnValueOnce('authz-bundles/systems');

    setupGcloud.mockResolvedValueOnce('');
    getBundleName.mockReturnValueOnce('tst.test-system-staging.tar.gz');
    createTestBundle.mockResolvedValueOnce('test-bundle');
    opaTest.mockResolvedValueOnce(0);

    const result = await action();

    expect(result).toEqual(0);
    expect(getBundleName).toHaveBeenCalled();
    expect(createTestBundle).toHaveBeenCalledWith(
      'tst.test-system-staging.tar.gz',
      'authz-bundles/systems',
    );
    expect(opaTest).toHaveBeenCalledWith('test-bundle');
    expect(setupGcloud).toHaveBeenCalledWith('test-sa');
  });

  test('It fails on missing policies', async () => {
    mockFs({});
    core.getInput
      .mockReturnValueOnce('inherit')
      .mockReturnValueOnce('authz-bundles/systems');

    await expect(() => action()).rejects.toThrow('No policies found.');

    expect(getBundleName).not.toHaveBeenCalled();
    expect(createTestBundle).not.toHaveBeenCalled();
    expect(opaTest).not.toHaveBeenCalled();
    expect(setupGcloud).not.toHaveBeenCalled();
  });

  test('It fails if tests fails', async () => {
    core.getInput
      .mockReturnValueOnce('inherit')
      .mockReturnValueOnce('authz-bundles/systems');

    setupGcloud.mockResolvedValueOnce('');
    getBundleName.mockReturnValueOnce('tst.test-system-staging.tar.gz');
    createTestBundle.mockResolvedValueOnce('test-bundle');
    opaTest.mockRejectedValueOnce(1);

    await expect(() => action()).rejects.toEqual(1);
    expect(getBundleName).toHaveBeenCalled();
    expect(createTestBundle).toHaveBeenCalledWith(
      'tst.test-system-staging.tar.gz',
      'authz-bundles/systems',
    );
    expect(opaTest).toHaveBeenCalledWith('test-bundle');
    expect(setupGcloud).not.toHaveBeenCalled();
  });
});
