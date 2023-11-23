const exec = require('@actions/exec');
const os = require('os');
const handleError = require('./error-handler');

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
const execGcloud = async (args, executable = 'gcloud', silent = true, skipErrorHandling = false) => {
  let output = '';
  let stderr = '';
  let error = false;
  await exec.exec(findExecutable(executable), args, {
    silent,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
      stderr: (data) => {
        stderr += data.toString('utf8');
      },
    },
  }).catch((err) => {
    error = true;
    if(skipErrorHandling) {
      throw err;
    }
  });
  if (error && !skipErrorHandling) {
    const action = `${args[1]} ${args[2]} ${args[3]}`;
    await handleError(stderr.trim(), action);
  }
  return output.trim();
};

module.exports = execGcloud;
