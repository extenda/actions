import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('../src/run-deploy.js');
vi.mock('../src/service-definition.js');
vi.mock('../src/configure-domains.js');

import * as core from '@actions/core';

import action from '../src/index.js';
import runDeploy from '../src/run-deploy.js';
import serviceDef from '../src/service-definition.js';

const orgEnv = process.env;

describe('Cloud Run Action', () => {
  afterEach(() => {
    vi.resetAllMocks();
    process.env = orgEnv;
  });

  beforeEach(() => {
    process.env = { ...orgEnv };
  });

  test('It fails to run the action due to deprecation', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exited with code ${code}`);
    });
    
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');

    await expect(action()).rejects.toThrow('Process exited with code 0');

    expect(core.warning).toHaveBeenCalledWith('This action is deprecated and has been disabled!');
    expect(core.warning).toHaveBeenCalledWith('Please migrate to the new cloud-deploy Action for continued support and new features.');
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(runDeploy).not.toHaveBeenCalled();
    
    mockExit.mockRestore();
  });
});
