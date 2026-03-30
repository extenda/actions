import * as exec from '@actions/exec';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { execGcloud, findExecutable } from '../src/exec-gcloud.js';

vi.mock('@actions/exec');

describe('findExecutable', () => {
  test('picks gcloud for gcloud, undefined, and null', () => {
    expect(findExecutable('gcloud')).toEqual('gcloud');
    expect(findExecutable(undefined)).toEqual('gcloud');
    expect(findExecutable(null)).toEqual('gcloud');
  });

  test('picks gsutil for gsutil', () => {
    expect(findExecutable('gsutil')).toEqual('gsutil');
  });
});

describe('execGcloud', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('returns trimmed stdout on success', async () => {
    exec.getExecOutput.mockResolvedValue({
      exitCode: 0,
      stdout: 'some output\n',
      stderr: '',
    });

    const result = await execGcloud(['version'], 'gcloud', true);

    expect(result).toEqual('some output');
    expect(exec.getExecOutput).toHaveBeenCalledWith('gcloud', ['version'], {
      silent: true,
      ignoreReturnCode: true,
    });
  });

  test('logs combined error with stderr and throws on non-zero exit code', async () => {
    exec.getExecOutput.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'something went wrong',
    });

    await expect(
      execGcloud(['bad', 'command'], 'gcloud', false),
    ).rejects.toThrow(
      "The process 'gcloud' failed with exit code 1\n\nsomething went wrong",
    );
  });

  test('throws without logging when stderr is empty on failure', async () => {
    exec.getExecOutput.mockResolvedValue({
      exitCode: 2,
      stdout: '',
      stderr: '',
    });

    await expect(
      execGcloud(['bad', 'command'], 'gcloud', false),
    ).rejects.toThrow("The process 'gcloud' failed with exit code 2");
  });

  test('uses custom executable name in error message', async () => {
    exec.getExecOutput.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'gsutil error',
    });

    await expect(execGcloud(['ls'], 'gsutil', false)).rejects.toThrow(
      "The process 'gsutil' failed with exit code 1\n\ngsutil error",
    );

    expect(exec.getExecOutput).toHaveBeenCalledWith('gsutil', ['ls'], {
      silent: false,
      ignoreReturnCode: true,
    });
  });
});
