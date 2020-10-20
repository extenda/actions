jest.mock('@actions/core');
jest.mock('request');
const request = require('request');
const checkRepository = require('../src/handle-repository');

describe('Check and update repository reference', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can compare repository url and update system', async () => {
    const systemResult = {
      id: 'test-id',
      source_control: {
        origin: {
          url: 'https://github.com/extenda/test-repo.git',
        },
      },
    };
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    await checkRepository(systemResult, 'token', 'styra-url', 'test-repo-no-match');

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it can compare repository url and not update system on match', async () => {
    const systemResult = {
      id: 'test-id',
      source_control: {
        origin: {
          url: 'https://github.com/extenda/test-repo.git',
        },
      },
    };
    await checkRepository(systemResult, 'token', 'styra-url', 'test-repo');

    expect(request).toHaveBeenCalledTimes(0);
  });
});
