const core = require('@actions/core');
const action = require('../src/index');
const runDeploy = require('../src/run-deploy');
const serviceDefinition = require('../../cloud-run/src/service-definition');

jest.mock('@actions/core');
jest.mock('../src/run-deploy');
jest.mock('../../cloud-run/src/service-definition');

describe('Kubernetes Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    serviceDefinition.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce(serviceDefinition)
      .mockReturnValueOnce('image:tag');
    runDeploy.mockResolvedValueOnce({});
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'image:tag',
    );
  });
});
