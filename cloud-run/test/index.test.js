jest.mock('@actions/core');
jest.mock('../src/run-deploy');
jest.mock('../src/service-definition');
jest.mock('../src/configure-domains');

const core = require('@actions/core');
const action = require('../src/index');
const runDeploy = require('../src/run-deploy');
const serviceDef = require('../src/service-definition');

describe('Cloud Run Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    runDeploy.mockResolvedValueOnce({});
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      false,
      false,
    );
  });

  test('It can run without optional args', async () => {
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    runDeploy.mockResolvedValueOnce({});

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      false,
      false,
    );
  });

  test('It can run with enable-http2 flag set', async () => {
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false');
    runDeploy.mockResolvedValueOnce({});

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      true,
      false,
    );
  });

  test('It can run with verbose flag set', async () => {
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('true');
    runDeploy.mockResolvedValueOnce({});

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      false,
      true,
    );
  });
});
