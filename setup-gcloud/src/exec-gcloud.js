const exec = require('@actions/exec');
const os = require('os');

/**
 * Execute gcloud and return the standard output.
 * @param {Array<string>} args command line arguments array
 * @param silent flag indicating if execution should be silent, defaults to false
 * @returns {Promise<string>} the trimmed standard output string
 */
const execGcloud = async (args, silent = false) => {
  let output = '';
  const gcloud = os.platform() === 'win32' ? 'gcloud.cmd' : 'gcloud';
  await exec.exec(gcloud, args, {
    silent,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.trim();
};

module.exports = execGcloud;
