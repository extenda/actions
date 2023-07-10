jest.mock('@actions/core');
jest.mock('../../setup-gcloud-base/src/setup-gcloud', () => () => 'stub-project-id');
jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
}));

const core = require('@actions/core');
const exec = require('@actions/exec');
const action = require('../src/index');

describe('action', () => {
  beforeEach(() => {
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

    exec.exec.mockImplementation((command, args, options) => {
      if (args.includes('list')) {
        options.listeners.stdout(stubValues['target-revision']);
      }
    });
    expect(await action()).toBeUndefined();

    expect(core.getInput).toHaveBeenCalledWith('service-account-key', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('service', { required: true });
    expect(core.getInput).toHaveBeenCalledWith('target-revision', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('percentage');

    expect(exec.exec).toHaveBeenCalledTimes(2);

    expect(exec.exec).toHaveBeenCalledWith(
      'gcloud',
      [
        'run',
        'revisions',
        'list',
        `--service=${stubValues.service}`,
        '--region=europe-west1',
        `--project=${'stub-project-id'}`,
        '--format="value[](name)"',
      ],
      {
        silent: false,
        listeners: {
          stdout: expect.any(Function),
        },
      },
    );

    expect(exec.exec).toHaveBeenCalledWith(
      'gcloud',
      [
        'run',
        'services',
        'update-traffic',
        stubValues.service,
        `--to-revisions=${stubValues['target-revision']}=${stubValues.percentage}`,
        '--region=europe-west1',
        `--project=${'stub-project-id'}`,
      ],
      {
        silent: false,
        listeners: {
          stdout: expect.any(Function),
        },
      },
    );
  });

  it('fails to route traffic if revision is missing', async () => {
    const stubValues = {
      'service-account-key': 'service-account-key-stub',
      service: 'service1',
      'target-revision': 'revision1',
      percentage: '100',
    };

    core.getInput.mockImplementation((name) => stubValues[name]);

    exec.exec.mockImplementation((command, args, options) => {
      if (args.includes('list')) {
        options.listeners.stdout('other-revision');
      }
    });
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

    expect(exec.exec).toHaveBeenCalledTimes(1);

    expect(exec.exec).toHaveBeenCalledWith(
      'gcloud',
      [
        'run',
        'revisions',
        'list',
        `--service=${stubValues.service}`,
        '--region=europe-west1',
        `--project=${'stub-project-id'}`,
        '--format="value[](name)"',
      ],
      {
        silent: false,
        listeners: {
          stdout: expect.any(Function),
        },
      },
    );
  });
});
