const fs = require('fs');
const { resolve } = require('path');
const exec = require('@actions/exec');
const rmdir = require('rmdir');
const { outputCommand, extractOutput, LogFilter } = require('../src/extract-output');

const execTarCommand = async () => {
  const tarCommand = outputCommand(['src', '*.json']);
  let output = '';
  return exec.exec(tarCommand.shift(), tarCommand, {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  }).then(() => output.trim());
};

const getFiles = (dir) => {
  const children = fs.readdirSync(dir);
  const files = children.map((child) => {
    const res = resolve(dir, child);
    return fs.lstatSync(res).isDirectory() ? getFiles(res) : res;
  });
  return files.flat();
};

const orgCwd = process.cwd();

describe('Extract output', () => {
  beforeAll(() => {
    process.chdir(resolve(__dirname, '..'));
  });

  afterAll(() => {
    process.chdir(orgCwd);
  });

  afterEach(() => {
    rmdir(resolve('test-pod-output'));
  });

  test('It generates an output command', () => {
    const command = outputCommand(['coverage', '*.txt']);
    expect(command).toEqual([
      '/bin/sh',
      '-c',
      'echo Archiving output...; echo test-pod-output BEGIN; tar -czf - coverage *.txt | base64; echo test-pod-output END',
    ]);
  });

  test('It filters output with LogFilter', () => {
    const filter = new LogFilter();
    const write = jest.fn();
    const stream = {
      write,
    };
    filter.log(Buffer.from('start', 'utf8'), stream);
    expect(write).toHaveBeenCalledWith(Buffer.from('start', 'utf8'));

    filter.log(Buffer.from('test-pod-output BEGIN', 'utf8'), stream);
    expect(write).not.toHaveBeenCalledWith(Buffer.from('test-pod-output BEGIN', 'utf8'));

    filter.log(Buffer.from('base 64 encoded TAR data', 'utf8'), stream);
    expect(write).not.toHaveBeenCalledWith(Buffer.from('base 64 encoded TAR data', 'utf8'));

    filter.log(Buffer.from('test-pod-output END', 'utf8'), stream);
    expect(write).not.toHaveBeenCalledWith(Buffer.from('test-pod-output END', 'utf8'));

    filter.log(Buffer.from('done', 'utf8'), stream);
    expect(write).toHaveBeenCalledWith(Buffer.from('done', 'utf8'));

    expect(write).toHaveBeenCalledTimes(2);
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
      const outputDir = resolve('test-pod-output');
      const files = getFiles(outputDir);
      expect(files).toEqual(expect.arrayContaining([
        resolve(outputDir, 'src/extract-output.js'),
        resolve(outputDir, 'package.json'),
        resolve(outputDir, 'package-lock.json'),
      ]));
    });
  }
});
