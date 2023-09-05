jest.mock('@actions/core');
jest.mock('request');

const request = require('request');
const checkSystem = require('../../src/manifests/check-system');

describe('Check styra system', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can check system exists', async () => {
    const systemInfo = {
      result: [
        {
          name: 'test-staging',
        },
      ],
    };

    request.mockImplementation((conf, cb) => cb(
      null,
      { statusCode: 200 },
      JSON.stringify(systemInfo),
    ));

    await checkSystem('systemName', 'styraToken', 'styraUrl');

    expect(request).toHaveBeenCalledTimes(1);
  });
});
