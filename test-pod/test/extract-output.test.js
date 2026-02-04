import * as exec from '@actions/exec';
import fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { extractOutput, LogFilter } from '../src/extract-output.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testPodDir = resolve(__dirname, '..');

const outputCommand = (patterns) => [
  '/bin/sh',
  '-c',
  `echo test-pod-output BEGIN; tar -czf - ${patterns.join(' ')} | base64; echo test-pod-output END`,
];

const execTarCommand = async () => {
  const tarCommand = outputCommand(['src', '*.json']);
  let output = '';
  return exec
    .exec(tarCommand.shift(), tarCommand, {
      silent: true,
      cwd: testPodDir,
      listeners: {
        stdout: (data) => {
          output += data.toString('utf8');
        },
      },
    })
    .then(() => output.trim());
};

const getFiles = (dir) => {
  const children = fs.readdirSync(dir);
  const files = children.map((child) => {
    const res = resolve(dir, child);
    return fs.lstatSync(res).isDirectory() ? getFiles(res) : res;
  });
  return files.flat();
};

describe('Extract output', () => {
  afterEach(() => {
    const dir = resolve(process.cwd(), 'test-pod-output');
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir, { recursive: true });
    }
  });

  test('It filters output with LogFilter', () => {
    const filter = new LogFilter();
    const write = vi.fn();
    const stream = {
      write,
    };
    filter.log(Buffer.from('start', 'utf8'), stream);
    expect(write).toHaveBeenCalledWith(Buffer.from('start', 'utf8'));

    filter.log(Buffer.from('test-pod-output BEGIN', 'utf8'), stream);
    expect(write).not.toHaveBeenCalledWith(
      Buffer.from('test-pod-output BEGIN', 'utf8'),
    );

    filter.log(Buffer.from('base 64 encoded TAR data', 'utf8'), stream);
    expect(write).not.toHaveBeenCalledWith(
      Buffer.from('base 64 encoded TAR data', 'utf8'),
    );

    filter.log(Buffer.from('test-pod-output END', 'utf8'), stream);
    expect(write).not.toHaveBeenCalledWith(
      Buffer.from('test-pod-output END', 'utf8'),
    );

    filter.log(Buffer.from('done', 'utf8'), stream);
    expect(write).toHaveBeenCalledWith(Buffer.from('done', 'utf8'));

    expect(write).toHaveBeenCalledTimes(2);
  });

  test('It can handle no output', async () => {
    const output = await extractOutput('Log statement');
    expect(output).toBeNull();
  });

  test('It will discard output with missing END', async () => {
    const output = await extractOutput(
      'test-pod-output BEGIN\nBinary data\nMore data',
    );
    expect(output).toBeNull();
  });

  test('It will discard output with END before BEGIN', async () => {
    const output = await extractOutput(
      'test-pod-output END\nBinary data\ntest-pod-output BEGIN',
    );
    expect(output).toBeNull();
  });

  if (process.platform !== 'win32') {
    test('It can create a tar archive', async () => {
      const output = await execTarCommand();
      expect(output).toContain('test-pod-output BEGIN');
      expect(output).toContain('test-pod-output END');
    });

    test('It can extract archived files from output', async () => {
      const output = await execTarCommand();
      await extractOutput(output);
      const outputDir = resolve(process.cwd(), 'test-pod-output');
      const files = getFiles(outputDir);
      expect(files).toEqual(
        expect.arrayContaining([
          resolve(outputDir, 'src/extract-output.js'),
          resolve(outputDir, 'package.json'),
          resolve(outputDir, 'package-lock.json'),
        ]),
      );
    });
  }
});
