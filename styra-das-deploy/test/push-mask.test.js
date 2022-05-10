jest.mock('@actions/core');
jest.mock('request');

const request = require('request');
const pushMask = require('../src/push-mask');

describe('fetch and push policy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can fetch the mask', async () => {
    const mockReturn = {
      result: {
        modules: {
          'mask.rego': 'package system.log\\n\\nmask[\\"/input/request/http/headers/token\\"]\\n\\n',
        },
      },
    };
    request.mockImplementation((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(mockReturn)));
    await pushMask('https://test.url.com', 'token', 'staging-id', 'prod-id');

    expect(request).toHaveBeenCalledTimes(2);
  });

  test('it can\'t fetch the policy', async () => {
    request.mockImplementation((conf, cb) => cb(null, { statusCode: 400 }, ''));

    await expect(pushMask('https://test.url.com', 'token', 'staging-id', 'prod-id')).rejects.toEqual(new Error('Couldn\'t fetch mask for system with id: staging-id'));
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it can\'t update the policy', async () => {
    const mockReturn = {
      result: {
        modules: {
          'mask.rego': 'package system.log\n\nmask[\\"/input/request/http/headers/token\\"]\n\n',
        },
      },
    };
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(mockReturn)));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }, ''));

    await expect(pushMask('https://test.url.com', 'token', 'staging-id', 'prod-id')).rejects.toEqual(new Error('Couldn\'t update mask for production system'));
    expect(request).toHaveBeenCalledTimes(2);
  });
});
