const exec = require('@actions/exec');

const getLatestRevision = async (namespace, { cluster, clusterLocation, project }) => {
  let output = '';
  await exec.exec('gcloud', [
    'run',
    'revisions',
    'list',
    `--namespace=${namespace}`,
    `--project=${project}`,
    `--cluster=${cluster}`,
    `--cluster-location=${clusterLocation}`,
    '--platform=gke',
    '--format=value(REVISION)',
  ], {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  const list = output.trim().split(/[\r\n]+/);
  return list[list.length - 1];
};

module.exports = getLatestRevision;
