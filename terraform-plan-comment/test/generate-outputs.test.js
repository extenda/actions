import * as exec from '@actions/exec';
import fs from 'fs';
import mockFs from 'mock-fs';
import { afterEach, describe, expect, test, vi } from 'vitest';

import generateOutputs from '../src/generate-outputs.js';

const terragruntFs = {
  'base/work': {
    moduleA: {
      'plan.out': 'moduleA',
      '.terragrunt-cache': {
        UUID1: {
          UUID2: {
            '.keep': '',
          },
        },
      },
    },
    moduleB: {
      '.terragrunt-cache': {
        UUID1: {
          UUID2: {
            'plan.out': 'moduleB',
          },
        },
      },
    },
  },
};

vi.mock('@actions/exec');

const mockOutput = async (data, opts, success = true) => {
  if (opts && opts.listeners) {
    opts.listeners.stdout(Buffer.from(`${data}\n`, 'utf8'));
    if (!success) {
      opts.listeners.stderr(Buffer.from('Error\n', 'utf8'));
    }
  }
  if (success) {
    return Promise.resolve(0);
  }
  return Promise.reject(new Error('Exit with error'));
};

describe('Generate Terraform plan output', () => {
  afterEach(() => {
    mockFs.restore();
    vi.resetAllMocks();
  });

  test('It can process nested terragrunt plans', async () => {
    mockFs(terragruntFs);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput('Module A changes', opts),
      )
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput('Module B changes', opts),
      );

    const outputs = await generateOutputs('base/work', 'plan.out');
    expect(outputs).toEqual([
      {
        module: 'moduleA',
        output: 'Module A changes',
        status: 0,
        plan: 'base/work/moduleA/plan.out',
      },
      {
        module: 'moduleB',
        output: 'Module B changes',
        status: 0,
        plan: 'base/work/moduleB/.terragrunt-cache/UUID1/UUID2/plan.out',
      },
    ]);
    expect(exec.exec).toHaveBeenNthCalledWith(
      1,
      'terraform',
      ['show', '-no-color', '../../../plan.out'],
      expect.objectContaining({
        cwd: 'base/work/moduleA/.terragrunt-cache/UUID1/UUID2',
      }),
    );

    expect(exec.exec).toHaveBeenNthCalledWith(
      2,
      'terraform',
      ['show', '-no-color', 'plan.out'],
      expect.objectContaining({
        cwd: 'base/work/moduleB/.terragrunt-cache/UUID1/UUID2',
      }),
    );

    expect(fs.existsSync('base/work/moduleA/plan.out.changes')).toEqual(true);
    expect(fs.existsSync('base/work/moduleB/plan.out.changes')).toEqual(true);
  });

  test('It can process a single plan file', async () => {
    mockFs({
      'path/to/work/plan.out': 'single-plan',
    });
    exec.exec.mockImplementationOnce((bin, args, opts) =>
      mockOutput('Changed terraform plan.', opts),
    );
    const outputs = await generateOutputs('path/to/work', 'plan.out');
    expect(outputs).toHaveLength(1);
    expect(outputs).toEqual([
      {
        module: 'work',
        output: 'Changed terraform plan.',
        status: 0,
        plan: 'path/to/work/plan.out',
      },
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('It will filter unchanged plans', async () => {
    mockFs(terragruntFs);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          'Module A unchanged. 0 to add, 0 to change, 0 to destroy.\n',
          opts,
        ),
      )
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput('Module B changes', opts),
      )
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput('Module C. No changes. Infrastructure is up-to-date.', opts),
      );
    const outputs = await generateOutputs('base/work', 'plan.out');
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(outputs).toHaveLength(1);
    expect(outputs).toEqual([
      {
        module: 'moduleB',
        output: 'Module B changes',
        status: 0,
        plan: 'base/work/moduleB/.terragrunt-cache/UUID1/UUID2/plan.out',
      },
    ]);
    expect(fs.existsSync('base/work/moduleA/plan.out.changes')).toEqual(false);
    expect(fs.existsSync('base/work/moduleB/plan.out.changes')).toEqual(true);
  });

  test('It will filter changing ignored objects', async () => {
    mockFs(terragruntFs);
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          '# module.module_a.resource.resource_a must be replaced\n' +
            'Module A Plan: 1 to add, 0 to change, 1 to destroy.\n',
          opts,
        ),
      )
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          '# module.module_b.resource.ignored_resource_b must be replaced\n' +
            'Module B Plan: 1 to add, 0 to change, 1 to destroy.\n',
          opts,
        ),
      );
    const outputs = await generateOutputs(
      'base/work',
      'plan.out',
      1,
      'module.module_b.resource.ignored_resource_b',
    );
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(outputs).toHaveLength(1);
    expect(outputs).toEqual([
      {
        module: 'moduleA',
        output:
          '# module.module_a.resource.resource_a must be replaced\nModule A Plan: 1 to add, 0 to change, 1 to destroy.',
        status: 0,
        plan: 'base/work/moduleA/plan.out',
      },
    ]);
  });

  test('It will swallow and report terraform error', async () => {
    mockFs({
      'base/work/plan.out': 'bad-plan',
    });
    exec.exec.mockImplementationOnce((bin, args, opts) =>
      mockOutput('Terraform output', opts, false),
    );
    const outputs = await generateOutputs('base/work', 'plan.out');
    expect(outputs).toHaveLength(1);
    expect(outputs).toEqual([
      {
        module: 'work',
        output: 'Terraform output\nError',
        status: 1,
        plan: 'base/work/plan.out',
      },
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
