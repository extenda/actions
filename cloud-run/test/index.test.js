jest.mock('@actions/core');
jest.mock('../src/run-deploy');
jest.mock('../src/service-definition');
jest.mock('../src/configure-domains');

const core = require('@actions/core');
const action = require('../src/index');
const runDeploy = require('../src/run-deploy');
const serviceDef = require('../src/service-definition');

const env = {
  ...process.env,
};

describe('Cloud Run Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
    process.env = env;
    delete process.env.GITHUB_REF;
  });

  test('It can run the action', async () => {
    process.env.GITHUB_REF = 'master';
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    runDeploy.mockResolvedValueOnce({});
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      false,
    );
  });

  test('It can run without optional args', async () => {
    process.env.GITHUB_REF = 'master';
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    runDeploy.mockResolvedValueOnce({});

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      false,
    );
  });

  test('It can run with verbose flag set', async () => {
    process.env.GITHUB_REF = 'main';
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('true');
    runDeploy.mockResolvedValueOnce({});

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      true,
    );
  });

  test('It cannot run the action if branch is not master or main', async () => {
    process.env.GITHUB_REF = 'develop';
    serviceDef.mockReturnValueOnce({});
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    await expect(action()).rejects
      .toEqual(new Error('Failed to deploy. You must follow trunk-based development and deploy from master or main branch only'));
  });
});
