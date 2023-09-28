const { execGcloud } = require('../../../setup-gcloud');

const getRevisions = async (service, project, region) => {
  const output = await execGcloud([
    'run',
    'revisions',
    'list',
    `--service=${service}`,
    `--project=${project}`,
    `--region=${region}`,
    '--format=json',
  ]);

  // Return a sorted array of revisions with newest to oldest.
  return JSON.parse(output.trim())
    .map((rev) => ({
      name: rev.metadata.name,
      creationTimestamp: rev.metadata.creationTimestamp,
    }))
    .sort((a, b) => Date.parse(b.creationTimestamp) - Date.parse(a.creationTimestamp));
};

module.exports = getRevisions;
