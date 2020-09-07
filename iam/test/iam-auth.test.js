jest.mock('@actions/core');
jest.mock('request');

const request = require('request');
const fetchIamToken = require('../src/iam-auth');

describe('fetch iam-api token', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can fetch api token', async () => {
    const response = {
      idToken: 'token',
    };

    request.mockImplementation((conf, cb) => cb(null, { statusCode: 200 },
      response));

    await expect(fetchIamToken('key', 'email', 'password', 'tenantId'))
      .resolves.toEqual('token');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
