jest.mock('@actions/exec');

const exec = require('@actions/exec');
const checkStatusAndKillFailingPods = require('../src/rollback');

describe('rollback', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can delete failing pods', async () => {
    const podList = {
      items: [
        {
          spec: {
            hostname: 'testrunner-txengine-0',
          },
          status: {
            conditions: [
              {
                status: 'True',
              },
              {
                status: 'True',
              },
              {
                status: 'True',
              },
            ],
          },
        },
        {
          spec: {
            hostname: 'testrunner-txengine-1',
          },
          status: {
            conditions: [
              {
                status: 'True',
              },
              {
                status: 'False',
              },
              {
                status: 'True',
              },
            ],
          },
        },
      ],
    };
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(podList)));

    await checkStatusAndKillFailingPods('namespace');
    expect(exec.exec).toHaveBeenNthCalledWith(2, 'kubectl',
      expect.arrayContaining(['delete', 'pod', 'testrunner-txengine-1', '-n', 'namespace']), expect.anything());
  });
});
