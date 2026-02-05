import mockFs from 'mock-fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock out tools download
vi.mock('../../utils/src');
vi.mock('@actions/core');

import * as core from '@actions/core';
import os from 'os';

import { loadTool } from '../../utils/src/index.js';
import { action, platform } from '../src/index.js';

describe('Setup Terraform', () => {
  afterEach(() => {
    vi.resetAllMocks();
    mockFs.restore();
  });

  beforeEach(() => {
    loadTool
      .mockResolvedValueOnce('/downloads/terraform_x64/terraform')
      .mockResolvedValueOnce('/downloads/terragrunt_x64/terragrunt');
  });

  test('It can download tool versions from dot version files', async () => {
    vi.spyOn(os, 'platform');
    os.platform.mockReturnValue('linux');

    mockFs({
      '.terraform-version': '1.2.0',
      '.terragrunt-version': '1.0.0',
      '/downloads/terragrunt_x64/terragrunt': '',
      '/downloads/terraform_x64/terraform': '',
    });

    core.getInput
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('.terragrunt-version');

    await action();

    expect(loadTool).toHaveBeenCalledWith({
      tool: 'terraform',
      binary: 'terraform',
      version: '1.2.0',
      downloadUrl: `https://releases.hashicorp.com/terraform/1.2.0/terraform_1.2.0_${platform()}_amd64.zip`,
    });

    expect(loadTool).toHaveBeenCalledWith({
      tool: 'terragrunt',
      binary: 'terragrunt',
      version: '1.0.0',
      downloadUrl: `https://github.com/gruntwork-io/terragrunt/releases/download/v1.0.0/terragrunt_${platform()}_amd64`,
    });
  });

  test('It can download specified versions', async () => {
    mockFs({
      '/downloads/terragrunt_x64/terragrunt': '',
      '/downloads/terraform_x64/terraform': '',
    });
    core.getInput
      .mockReturnValueOnce('20.0.0')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('10.0.0');

    await action();

    expect(loadTool.mock.calls[0][0]).toMatchObject({
      tool: 'terraform',
      version: '20.0.0',
    });
    expect(loadTool.mock.calls[1][0]).toMatchObject({
      tool: 'terragrunt',
      version: '10.0.0',
    });
  });

  test('It fails on invalid semver', async () => {
    mockFs({
      '/downloads/terraform_x64/terraform': '',
    });
    core.getInput
      .mockReturnValueOnce('20.0.0')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('invalid value');

    await expect(action()).rejects.toEqual(
      new Error('File not found: invalid value'),
    );
  });

  test('It fails on invalid semver in file', async () => {
    mockFs({
      '.terraform-version': 'invalid-tf',
      '.terragrunt-version': 'invalid-tg',
    });
    await expect(action()).rejects.toEqual(
      new Error('Invalid semver version: invalid-tf'),
    );
  });

  test('It fails if file not found', async () => {
    mockFs({});

    core.getInput.mockReturnValueOnce('.terraform-version');

    await expect(action()).rejects.toEqual(
      new Error('File not found: .terraform-version'),
    );
  });

  test('It can skip terragrunt', async () => {
    mockFs({
      '/downloads/terraform_x64/terraform': '',
    });
    core.getInput.mockReturnValueOnce('20.0.0').mockReturnValueOnce('true');

    await action();
    expect(loadTool).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(2);
  });
});
