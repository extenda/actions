const exec = require('@actions/exec');

const gcloudOutput = async (args, bin = 'gcloud') => {
  let output = '';
  await exec.exec(bin, args, {
    silent: false,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.trim();
};

module.exports = gcloudOutput;
