jest.mock('@actions/core');
jest.mock('../../setup-gcloud');

const core = require('@actions/core');
const { setupGcloud, execGcloud } = require('../../setup-gcloud');
const action = require('../src/index');

describe('action', () => {
  beforeEach(() => {
    setupGcloud.mockResolvedValue('stub-project-id');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('routes traffic to new revision', async () => {
    const stubValues = {
      'service-account-key': 'service-account-key-stub',
      service: 'service1',
      'target-revision': 'revision1',
      percentage: '100',
    };

    core.getInput.mockImplementation((name) => stubValues[name]);
    execGcloud.mockResolvedValueOnce(stubValues['target-revision']);
    expect(await action()).toBeUndefined();

    expect(core.getInput).toHaveBeenCalledWith('service-account-key', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('service', { required: true });
    expect(core.getInput).toHaveBeenCalledWith('target-revision', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('percentage');

    expect(execGcloud).toHaveBeenCalledTimes(1);

    expect(execGcloud).toHaveBeenCalledWith([
      'run',
      'services',
      'update-traffic',
      stubValues.service,
      `--to-revisions=${stubValues['target-revision']}=${stubValues.percentage}`,
      '--region=europe-west1',
      '--project=stub-project-id',
    ]);
  });
});
