import gcloudOutput from './gcloud-output.js';

const getPreviousRevision = async (
  service,
  projectID,
  region = 'europe-west1',
) => {
  const output = await gcloudOutput([
    'run',
    'services',
    'describe',
    service,
    `--project=${projectID}`,
    `--region=${region}`,
    '--format=json(status.traffic)',
  ]);
  // gcloudOutput logs a failed describe (for example a service that does not
  // exist yet on its first deploy) and returns an empty string.
  if (!output) {
    return null;
  }
  const { status } = JSON.parse(output);
  const serving = (status?.traffic ?? []).find((t) => t.percent === 100);
  return serving?.revisionName ?? null;
};

const getNewRevision = async (service, projectID, region = 'europe-west1') => {
  return gcloudOutput([
    'run',
    'revisions',
    'list',
    `--service=${service}`,
    `--project=${projectID}`,
    `--region=${region}`,
    '--sort-by=~creationTimestamp',
    '--limit=1',
    '--format=value(metadata.name)',
  ]);
};

export { getNewRevision, getPreviousRevision };
