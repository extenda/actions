jest.mock('axios');

const axios = require('axios');
const fetchSystemId = require('../src/fetch-system-id');

describe('fetch systemId from system name', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can fetch the systemId', async () => {
    const fetchSystem = {
      result: [
        {
          id: 'system-id',
        },
      ],
    };
    axios.mockResolvedValueOnce({ status: 200, data: fetchSystem });
    await expect(fetchSystemId('styra-url', 'styra-token', 'system-name')).resolves.toEqual('system-id');
  });

  test('It can\'t fetch the systemId', async () => {
    axios.mockRejectedValueOnce({ message: 'error-called', response: { status: 404, data: { error: 'message' } } });
    await expect(fetchSystemId('styra-url', 'styra-token', 'system-name')).rejects
      .toEqual(new Error('Failed to fetch system system-name. Reason: error-called'));
    expect(axios).toHaveBeenCalledTimes(1);
  });
});
