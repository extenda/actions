import * as core from '@actions/core';
import mockFs from 'mock-fs';

import { setupGcloud } from '../../setup-gcloud';
import getBundleName from '../src/bundle-name.js';
import createTestBundle from '../src/create-test-bundle.js';
import action from '../src/index.js';
import opaTest from '../src/opa-test.js';

jest.mock('@actions/core');
jest.mock('../src/bundle-name.js');
jest.mock('../src/create-test-bundle.js');
jest.mock('../src/opa-test.js');
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
