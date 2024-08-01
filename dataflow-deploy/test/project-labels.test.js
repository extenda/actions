jest.mock('@actions/exec');
const exec = require('@actions/exec');
const projectLabels = require('../src/project-labels');

describe('Get projects labels', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Labels added', async () => {
    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      opts.listeners.stdout("--- cc: '640'");
      return Promise.resolve(0);
    });

    await expect(projectLabels('test-staging-323')).resolves.toEqual('640');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
