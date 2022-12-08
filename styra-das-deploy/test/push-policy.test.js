jest.mock('@actions/core');
jest.mock('request');

const request = require('request');
const pushPolicy = require('../src/push-policy');

describe('fetch and push policy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can fetch the policy', async () => {
    const mockReturn = {
      result: {
        modules: {
          'ingress.rego': 'package policy["com.styra.envoy.ingress"].rules.rules\n\nimport data.dataset\n\ndefault allow = true\n',
        },
      },
    };
    request.mockImplementation((conf, cb) => cb(
      null,
      { statusCode: 200 },
      JSON.stringify(mockReturn),
    ));
    await pushPolicy('https://test.url.com', 'token', 'staging-id', 'prod-id');

    expect(request).toHaveBeenCalledTimes(2);
  });

  test('it can\'t fetch the policy', async () => {
    request.mockImplementation((conf, cb) => cb(null, { statusCode: 400 }, ''));

    await expect(pushPolicy('https://test.url.com', 'token', 'staging-id', 'prod-id')).rejects.toEqual(new Error('Couldn\'t fetch policy for system with id: staging-id'));
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it can\'t update the policy', async () => {
    const mockReturn = {
      result: {
        modules: {
          'ingress.rego': 'package policy["com.styra.envoy.ingress"].rules.rules\n\nimport data.dataset\n\ndefault allow = true\n',
        },
      },
    };
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      JSON.stringify(mockReturn),
    ));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }, ''));

    await expect(pushPolicy('https://test.url.com', 'token', 'staging-id', 'prod-id')).rejects.toEqual(new Error('Couldn\'t update policy for production system'));
    expect(request).toHaveBeenCalledTimes(2);
  });
});
