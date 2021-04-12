const exec = require('@actions/exec');
const generateDeployLog = require('../src/deploy-log');

jest.mock('@actions/exec');

describe('Generate and upload deploy log', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It executes all parts', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    await generateDeployLog('test-service');
    expect(exec.exec).toHaveBeenCalledTimes(3);
    expect(exec.exec).toHaveBeenNthCalledWith(1, 'mkdir', [
      '-pv',
      `test-service/${year}_${month}/deployments/`,
    ]);
  });
});
