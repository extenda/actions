const exec = require('@actions/exec');
const handleError = require('./error-handler');
const { findExecutable } = require('../../../setup-gcloud/src/exec-gcloud');

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
    if (skipErrorHandling) {
      throw err;
    } else {
      const action = `${args[1]} ${args[2]} ${args[3]}`;
      handleError(stderr.trim(), action);
    }
  });
  return output.trim();
};

module.exports = execGcloud;
