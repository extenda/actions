import * as exec from '@actions/exec';
import mockFs from 'mock-fs';

jest.mock('@actions/exec');

import checkRequiredNumberOfPodsIsRunning from '../src/check-number-of-pods-running.js';

const mockErrorOutput = (data, opts) => {
  opts.listeners.stdout(Buffer.from(`${data}\n`, 'utf8'));
  return Promise.reject(new Error('exit code 1'));
};

const mockOutput = (data, opts) => {
  opts.listeners.stdout(Buffer.from(`${data}`, 'utf8'));
  return Promise.resolve(3);
};

const setCurrentNamespaceArgs = [
  'config',
  'set-context',
  '--current',
  '--namespace=testDeploymentName',
];

const getRunningPodsArgs = [
  'get',
  'pods',
  '--field-selector=status.phase=Running',
  '--no-headers=true',
  '| wc -l',
];

// Arguments to return number of pods that have status
// NOT Running which can be: Pending, Succeeded, Failed, Unknown.
const getNonRunningPodsArgs = [
  'get',
  'pods',
  '--field-selector=status.phase!=Running',
  '--no-headers=true',
  '| wc -l',
];

const getRunningPodsNoSelectorArgs = [
  'get',
  'pods',
  '--namespace=testDeploymentName',
  '--no-headers=true',
  "-o json | jq -r '.items[].status.phase' | grep -o 'Running' -c ",
];

describe('Check number of pods running', () => {
  beforeEach(() => {
    mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  test('It throws error if namespace does not exist', async () => {
    exec.exec.mockImplementationOnce().mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (NotFound): running pods not found',
          opts,
        ),
      )
      .mockResolvedValue(0);
    await expect(
      checkRequiredNumberOfPodsIsRunning('testDeploymentName', 3, 10, true),
    ).rejects.toEqual(
      new Error(
        'Deployment failed. Number of running pods is lower then expected replica count after 30 milliseconds.',
      ),
    );

    expect(exec.exec.mock.calls.length).toBeGreaterThan(1);
    expect(exec.exec.mock.calls[0][1]).toEqual(setCurrentNamespaceArgs);
    expect(exec.exec.mock.calls[1][1]).toEqual(getRunningPodsArgs);
  });

  test('It fails on unknown error', async () => {
    console.log = jest.fn();
    // Call before the retry.
    exec.exec.mockImplementationOnce().mockResolvedValue(0);
    // Calls inside of the retry.
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);

    // Calls outside of the retry.
    exec.exec
      .mockImplementationOnce((bin, args, opts) => mockOutput('3', opts))
      .mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);

    await expect(
      checkRequiredNumberOfPodsIsRunning('testDeploymentName', 3, 10, true),
    ).rejects.toEqual(
      new Error(
        'Deployment failed. Number of running pods is lower then expected replica count after 30 milliseconds.',
      ),
    );
    expect(exec.exec.mock.calls.length).toBeGreaterThan(3);
    // Checks that the second time exec was called it was with non-running parameters.
    expect(exec.exec.mock.calls[2][1]).toEqual(getNonRunningPodsArgs);
    expect(exec.exec.mock.calls[7][1]).toEqual(getRunningPodsNoSelectorArgs);
    expect(exec.exec.mock.calls[8][1]).toEqual(['config', 'view']);

    expect(console.log).toHaveBeenCalledTimes(2);
  });

  test('It executes successfully when running pods is equal to 3 and non-running to 0', async () => {
    exec.exec.mockImplementationOnce().mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) => mockOutput('3', opts))
      .mockResolvedValue(0);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockErrorOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(1);

    await checkRequiredNumberOfPodsIsRunning('testDeploymentName', 3, 10, true);
    expect(exec.exec).toHaveBeenCalledTimes(3);
    expect(exec.exec).not.toHaveBeenCalledWith('kubectl', [
      'create',
      'namespace',
      'deploymentNamespace',
    ]);
  });

  test('It does nothing when dry-run is provided', async () => {
    await checkRequiredNumberOfPodsIsRunning('testDeploymentName', 3, 10);
    expect(exec.exec).toHaveBeenCalledTimes(0);
  });
});
