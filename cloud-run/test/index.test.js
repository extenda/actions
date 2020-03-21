jest.mock('@actions/core');
jest.mock('../src/run-deploy');
jest.mock('../src/service-definition');

const core = require('@actions/core');
const runDeploy = require('../src/run-deploy');
const serviceDef = require('../src/service-definition');

describe('Cloud Run Action', () => {
  test('It can run the action', async () => {
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('account@gmail.com')
      .mockReturnValueOnce('gcr.io/project/image:tag');

    // eslint-disable-next-line global-require
    await require('../src/index');

    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'account@gmail.com',
      'gcr.io/project/image:tag',
    );
  });
});
