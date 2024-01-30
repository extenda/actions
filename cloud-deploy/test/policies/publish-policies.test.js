const mockFs = require('mock-fs');
const { Axios } = require('axios');
const { execGcloud } = require('../../../setup-gcloud');
const publishPolicies = require('../../src/policies/publish-policies');

jest.mock('../../../setup-gcloud');

describe('Publish policies', () => {
  let axiosPut;

  beforeEach(() => {
    axiosPut = jest.spyOn(Axios.prototype, 'put');
    execGcloud.mockResolvedValueOnce('idToken');
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  test('It will publish policies if prefix and files exists', async () => {
    mockFs({
      'policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego': 'ingress',
      'policies/policy/com.styra.envoy.ingress/test/test/test.rego': 'test',
      'policies/system/log/mask.rego': 'mask',
    });

    axiosPut.mockResolvedValueOnce({ status: 200 });
    await publishPolicies(
      'my-service',
      'prod',
      '0.0.1-local',
      {
        security: {
          'permission-prefix': 'tst',
        },
      },
    );

    expect(execGcloud).toHaveBeenCalledWith(['auth', 'print-identity-token', '--audiences=iam-das-worker']);
    expect(axiosPut).toHaveBeenCalledWith(
      '/systems/tst.my-service-prod/policies',
      {
        revision: '0.0.1-local',
        files: expect.arrayContaining([
          { path: 'policy/com.styra.envoy.ingress/rules/rules/ingress.rego', content: 'ingress' },
          { path: 'policy/com.styra.envoy.ingress/test/test/test.rego', content: 'test' },
          { path: 'system/log/mask.rego', content: 'mask' },
        ]),
      },
    );
  });

  test('It will publish policies if monorepo', async () => {
    mockFs({
      'policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego': 'ingress',
      'policies/policy/com.styra.envoy.ingress/test/test/test.rego': 'test',
      'policies/system/log/mask.rego': 'mask',
    });

    axiosPut.mockResolvedValueOnce({ status: 200 });
    await publishPolicies(
      'my-service',
      'prod',
      '0.0.1-local',
      {
        security: {
          'permission-prefix': 'tst',
          'system-name': 'service123',
        },
      },
    );

    expect(execGcloud).toHaveBeenCalledWith(['auth', 'print-identity-token', '--audiences=iam-das-worker']);
    expect(axiosPut).toHaveBeenCalledWith(
      '/systems/tst.service123-prod/policies',
      {
        revision: '0.0.1-local',
        files: expect.arrayContaining([
          { path: 'policy/com.styra.envoy.ingress/rules/rules/ingress.rego', content: 'ingress' },
          { path: 'policy/com.styra.envoy.ingress/test/test/test.rego', content: 'test' },
          { path: 'system/log/mask.rego', content: 'mask' },
        ]),
      },
    );
  });

  test('It will not upload policies if prefix not set', async () => {
    mockFs({
      'policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego': 'ingress',
    });
    await publishPolicies(
      'my-service',
      'prod',
      '0.0.1-local',
      {
        security: 'none',
      },
    );
    expect(execGcloud).not.toHaveBeenCalled();
    expect(axiosPut).not.toHaveBeenCalled();
  });

  test('It will not upload policies if files does not exist', async () => {
    mockFs({});
    await publishPolicies(
      'my-service',
      'prod',
      '0.0.1-local',
      {
        security: {
          'permission-prefix': 'tst',
        },
      },
    );
    expect(execGcloud).not.toHaveBeenCalled();
    expect(axiosPut).not.toHaveBeenCalled();
  });

  test('It adds default log mask', async () => {
    mockFs({
      'policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego': 'ingress',
      'policies/policy/com.styra.envoy.ingress/test/test/test.rego': 'test',
    });

    axiosPut.mockResolvedValueOnce({ status: 200 });
    await publishPolicies(
      'my-service',
      'prod',
      '0.0.1-local',
      {
        security: {
          'permission-prefix': 'tst',
        },
      },
    );

    expect(execGcloud).toHaveBeenCalled();
    expect(axiosPut).toHaveBeenCalledWith(
      '/systems/tst.my-service-prod/policies',
      {
        revision: '0.0.1-local',
        files: expect.arrayContaining([
          { path: 'policy/com.styra.envoy.ingress/rules/rules/ingress.rego', content: 'ingress' },
          { path: 'policy/com.styra.envoy.ingress/test/test/test.rego', content: 'test' },
          { path: 'system/log/mask.rego', content: expect.stringContaining('mask["/input/attributes/request/http/headers/authorization"]') },
        ]),
      },
    );
  });

  test('It rejects promise if failing to update policies', async () => {
    mockFs({
      'policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego': 'ingress',
      'policies/policy/com.styra.envoy.ingress/test/test/test.rego': 'test',
    });

    axiosPut.mockRejectedValueOnce(new Error('TEST'));
    await expect(publishPolicies(
      'my-service',
      'prod',
      '0.0.1-local',
      {
        security: {
          'permission-prefix': 'tst',
        },
      },
    )).rejects.toThrow(new Error('TEST'));

    expect(execGcloud).toHaveBeenCalled();
    expect(axiosPut).toHaveBeenCalledWith(
      '/systems/tst.my-service-prod/policies',
      {
        revision: '0.0.1-local',
        files: expect.arrayContaining([
          { path: 'policy/com.styra.envoy.ingress/rules/rules/ingress.rego', content: 'ingress' },
          { path: 'policy/com.styra.envoy.ingress/test/test/test.rego', content: 'test' },
          { path: 'system/log/mask.rego', content: expect.any(String) },
        ]),
      },
    );
  });
});
