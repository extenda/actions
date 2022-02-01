jest.mock('@actions/core');
jest.mock('../src/push-policy');
jest.mock('../src/fetch-system-id');

const core = require('@actions/core');
const action = require('../src/index');
const pushPolicy = require('../src/push-policy');
const fetchSystemId = require('../src/fetch-system-id');

describe('run push policy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    fetchSystemId.mockResolvedValueOnce('systemId-staging');
    fetchSystemId.mockResolvedValueOnce('systemId-prod');
    core.getInput.mockReturnValueOnce('extenda')
      .mockReturnValueOnce('token')
      .mockReturnValueOnce('test')
      .mockReturnValueOnce('service-namespace');
    pushPolicy.mockResolvedValueOnce({});
    pushPolicy.mockResolvedValueOnce({});
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(pushPolicy).toHaveBeenCalledWith(
      'extenda',
      'token',
      'systemId-staging',
      'systemId-prod',
      'ingress',
    );
    expect(pushPolicy).toHaveBeenCalledWith(
      'extenda',
      'token',
      'systemId-staging',
      'systemId-prod',
      'app',
    );
  });
});
