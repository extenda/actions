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

    expect(execGcloud).toHaveBeenCalledTimes(2);

    expect(execGcloud).toHaveBeenCalledWith([
      'run',
      'revisions',
      'list',
      `--service=${stubValues.service}`,
      '--region=europe-west1',
      '--project=stub-project-id',
      '--format="value[](name)"',
    ]);

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

  it('fails to route traffic if revision is missing', async () => {
    const stubValues = {
      'service-account-key': 'service-account-key-stub',
      service: 'service1',
      'target-revision': 'revision1',
      percentage: '100',
    };

    core.getInput.mockImplementation((name) => stubValues[name]);

    execGcloud.mockResolvedValueOnce('other-revision');

    await expect(action()).rejects.toThrow(
      'Revision revision1 not found for service service1',
    );

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
      'revisions',
      'list',
      `--service=${stubValues.service}`,
      '--region=europe-west1',
      '--project=stub-project-id',
      '--format="value[](name)"',
    ]);
  });
});
