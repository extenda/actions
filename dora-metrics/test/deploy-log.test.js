import * as exec from '@actions/exec';

import { generateFolders, uploadToBucket } from '../src/deploy-log.js';

jest.mock('@actions/exec');
jest.mock('@actions/core');

describe('Generate and upload deploy log', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It executes all parts', async () => {
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    await generateFolders('test-service');
    await uploadToBucket('test-service');
    expect(exec.exec).toHaveBeenCalledTimes(3);
    expect(exec.exec).toHaveBeenNthCalledWith(1, 'mkdir', [
      '-pv',
      `test-service/${year}_${month}/deployments/`,
    ]);
  });
});
