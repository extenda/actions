const exec = require('@actions/exec');

/**
 * Execute a gcloud function and return the standard output.
 * @param args {string[]}
 * @returns {Promise<string>}
 */
const gcloudOutput = async (args) => {
  let output = '';
  await exec.exec('gcloud', args, {
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.trim();
};

module.exports = gcloudOutput;
