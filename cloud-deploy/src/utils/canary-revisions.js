import gcloudOutput from './gcloud-output.js';

/**
 * Look up the revision currently serving 100% traffic.
 * @returns {Promise<{firstDeploy: boolean, revision: string|null}>}
 *   firstDeploy is true when the service does not exist or has no traffic
 *   entries. revision is null when no single revision serves 100% traffic,
 *   for example while a canary is in progress.
 * gcloud failures are rethrown so they never look like a first deploy.
 */
const getPreviousRevision = async (
  service,
  projectID,
  region = 'europe-west1',
) => {
  // `list` returns an empty list for a missing service, whereas `describe`
  // fails. skipErrorHandling makes real gcloud errors throw.
  let output;
  try {
    output = await gcloudOutput(
      [
        'run',
        'services',
        'list',
        `--project=${projectID}`,
        `--region=${region}`,
        `--filter=metadata.name~^${service}$`,
        '--format=json(metadata.name,status.traffic)',
      ],
      'gcloud',
      true,
      true,
    );
  } catch (err) {
    throw new Error(
      `Failed to look up service ${service} in project ${projectID}, region ${region}: ${err.message}`,
      { cause: err },
    );
  }
  if (!output || !output.trim()) {
    throw new Error(
      `Unexpected empty output when looking up service ${service}`,
    );
  }
  const found = JSON.parse(output).find((s) => s.metadata?.name === service);
  const traffic = found?.status?.traffic ?? [];
  if (traffic.length === 0) {
    return { firstDeploy: true, revision: null };
  }
  const serving = traffic.find((t) => t.percent === 100);
  return { firstDeploy: false, revision: serving?.revisionName ?? null };
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
