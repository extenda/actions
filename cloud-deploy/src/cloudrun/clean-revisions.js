const core = require('@actions/core');
const getRevisions = require('./get-revisions');
const execGcloud = require('../utils/gcloud-output');

const deleteRevision = async (revisionName, project, region) => execGcloud([
  'run',
  'revisions',
  'delete',
  `${revisionName}`,
  '-q',
  `--project=${project}`,
  `--region=${region}`,
  '--no-user-output-enabled',
], 'gcloud', true, true);

const cleanRevisions = async (service, project, region, maxRevisions) => {
  const promises = [];
  await getRevisions(service, project, region)
    .then((revisions) => {
      if (revisions.length > maxRevisions) {
        for (let i = maxRevisions; i < revisions.length; i += 1) {
          const rev = revisions[i];
          if (!rev.active) {
            core.info(`Deleting revision '${rev.name}'`);
            promises.push(deleteRevision(rev.name, project, region));
          } else {
            core.info(`Keep active revision '${rev.name}'`);
          }
        }
      }
    });
  return Promise.all(promises);
};

module.exports = cleanRevisions;
