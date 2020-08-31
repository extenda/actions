jest.mock('@actions/core');
jest.mock('../src/push-policy');

const core = require('@actions/core');
const action = require('../src/index');
const pushPolicy = require('../src/push-policy');

describe('run push policy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput.mockReturnValueOnce('extenda')
      .mockReturnValueOnce('token')
      .mockReturnValueOnce('staging-id')
      .mockReturnValueOnce('prod-id');
    pushPolicy.mockResolvedValueOnce({});
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(pushPolicy).toHaveBeenCalledWith(
      'extenda',
      'token',
      'staging-id',
      'prod-id',
    );
  });
});
