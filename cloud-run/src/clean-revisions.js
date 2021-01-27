const exec = require('@actions/exec');
const core = require('@actions/core');

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
    '--filter=false',
    '--format=value(REVISION)',
  ], {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.split(/[\r\n]+/);
};
const deleteRevision = async (namespace, project, cluster, location, revisionName) => exec.exec('gcloud', [
  'run',
  'revisions',
  'delete',
  `${revisionName}`,
  '-q',
  `--namespace=${namespace}`,
  `--project=${project}`,
  `--cluster=${cluster}`,
  `--cluster-location=${location}`,
  '--platform=gke',
  '--no-user-output-enabled',
], { silent: true });

const cleanRevisions = async (namespace, project, cluster, location, maxRevisions) => {
  const promises = [];
  await getRevisions(namespace, project, cluster, location).then((revisions) => {
    const length = revisions.length - maxRevisions;
    if (length > 0) {
      for (let i = 0; i < length; i += 1) {
        core.info(`deleting revision '${revisions[i]}'`);
        promises.push(deleteRevision(namespace, project, cluster, location, revisions[i]));
      }
    }
  });
  return Promise.all(promises);
};

module.exports = cleanRevisions;
