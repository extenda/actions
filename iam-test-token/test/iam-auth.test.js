jest.mock('@actions/core');
jest.mock('axios');

const axios = require('axios');
const fetchIamToken = require('../src/iam-auth');

describe('fetch iam-api token', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can fetch api token', async () => {
    axios.post.mockResolvedValueOnce({ data: { idToken: 'test-token' } });

    const token = await fetchIamToken('key', 'email', 'password', 'tenantId');
    expect(token).toEqual('test-token');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('It throws exception on login failure', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'A message' } },
    });
    await expect(
      fetchIamToken('key', 'email', 'password', 'tenantId'),
    ).rejects.toEqual(
      new Error(
        'Authentication failed. HTTP status: 403. Reason: {"message":"A message"}',
      ),
    );
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
