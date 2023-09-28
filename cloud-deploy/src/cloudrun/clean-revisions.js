const core = require('@actions/core');
const getRevisions = require('./get-revisions');
const { execGcloud } = require('../../../setup-gcloud');

const deleteRevision = async (revisionName, project, region) => execGcloud([
  'run',
  'revisions',
  'delete',
  `${revisionName}`,
  '-q',
  `--project=${project}`,
  `--region=${region}`,
  '--no-user-output-enabled',
]);

const cleanRevisions = async (service, project, region, maxRevisions) => {
  const promises = [];
  await getRevisions(service, project, region)
    .then((revisions) => revisions.map((rev) => rev.name))
    .then((revisions) => {
      if (revisions.length > maxRevisions) {
        for (let i = maxRevisions; i < revisions.length; i += 1) {
          core.info(`Deleting revision '${revisions[i]}'`);
          promises.push(deleteRevision(revisions[i], project, region));
        }
      }
    });
  return Promise.all(promises);
};

module.exports = cleanRevisions;
