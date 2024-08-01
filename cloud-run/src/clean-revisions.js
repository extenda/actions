const exec = require('@actions/exec');
const core = require('@actions/core');
const getRevisions = require('./get-revisions');

const deleteRevision = async (
  namespace,
  project,
  cluster,
  location,
  revisionName,
) =>
  exec.exec(
    'gcloud',
    [
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
    ],
    { silent: true },
  );

const cleanRevisions = async (
  namespace,
  project,
  cluster,
  location,
  maxRevisions,
) => {
  const promises = [];
  await getRevisions(namespace, project, cluster, location)
    .then((revisions) => revisions.map((rev) => rev.name))
    .then((revisions) => {
      if (revisions.length > maxRevisions) {
        for (let i = maxRevisions; i < revisions.length; i += 1) {
          core.info(`deleting revision '${revisions[i]}'`);
          promises.push(
            deleteRevision(namespace, project, cluster, location, revisions[i]),
          );
        }
      }
    });
  return Promise.all(promises);
};

module.exports = cleanRevisions;
