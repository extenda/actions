const exec = require('@actions/exec');

const projectLabels = async (projectId) => {
  let output = '';
  await exec.exec('gcloud', [
    'projects',
    'describe',
    projectId,
    '--flatten=labels',
    '|',
    'grep',
    'cc',
  ], {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.substring(5, 8);
};

module.exports = projectLabels;
