import os from 'node:os';

import * as exec from '@actions/exec';

const findExecutable = (executable) => {
  if (executable === 'gcloud' || !executable) {
    return os.platform() === 'win32' ? 'gcloud.cmd' : 'gcloud';
  }
  return executable;
};

/**
 * Execute gcloud and return the standard output.
 * @param {Array<string>} args command line arguments array
 * @param executable alternative executable to use if not gcloud (e.g. gsutil)
 * @param silent flag indicating if execution should be silent, defaults to false
 * @returns {Promise<string>} the trimmed standard output string
 */
const execGcloud = async (args, executable = 'gcloud', silent = false) => {
  const command = findExecutable(executable);
  const result = await exec.getExecOutput(command, args, {
    silent,
    ignoreReturnCode: true,
  });

  if (result.exitCode !== 0) {
    let message = `The process '${command}' failed with exit code ${result.exitCode}`;
    if (result.stderr) {
      message = `${message}\n\n${result.stderr}`;
    }
    throw new Error(message);
  }

  return result.stdout.trim();
};

export { execGcloud, findExecutable };
