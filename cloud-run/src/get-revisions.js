const exec = require('@actions/exec');

const getRevisions = async (namespace, project, cluster, location) => {
  let output = '';
  await exec.exec('gcloud', [
    'run',
    'revisions',
    'list',
    `--namespace=${namespace}`,
    `--project=${project}`,
    `--cluster=${cluster}`,
    `--cluster-location=${location}`,
    '--platform=gke',
    '--format=json',
  ], {
    silent: false,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });

  // Return a sorted array of revisions with newest to oldest.
  return JSON.parse(output.trim())
    .map((rev) => ({
      name: rev.metadata.name,
      creationTimestamp: rev.metadata.creationTimestamp,
    }))
    .sort((a, b) => Date.parse(b.creationTimestamp) - Date.parse(a.creationTimestamp));
};

module.exports = getRevisions;
