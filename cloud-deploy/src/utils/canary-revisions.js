import getRevisions from '../cloudrun/get-revisions.js';
import gcloudOutput from './gcloud-output.js';
import { retryUntil } from './retry-until.js';

const TRAFFIC_TIMEOUT_MILLIS = 5 * 60 * 1000;

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
  if (!output?.trim()) {
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

/**
 * Read the traffic split of a service.
 * @returns {Promise<Array<{revisionName: string, percent: number}>>}
 */
const getTrafficSplit = async (service, projectID, region = 'europe-west1') => {
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
      `Failed to read traffic for service ${service} in project ${projectID}, region ${region}: ${err.message}`,
      { cause: err },
    );
  }
  if (!output?.trim()) {
    return [];
  }
  const found = JSON.parse(output).find((s) => s.metadata?.name === service);
  return (found?.status?.traffic ?? [])
    .filter((t) => t.revisionName)
    .map((t) => ({ revisionName: t.revisionName, percent: t.percent ?? 0 }));
};

/**
 * Route 100% of the traffic to one revision.
 */
const shiftTrafficToRevision = async (service, projectID, region, revision) => {
  try {
    await gcloudOutput(
      [
        'run',
        'services',
        'update-traffic',
        service,
        `--project=${projectID}`,
        `--region=${region}`,
        `--to-revisions=${revision}=100`,
      ],
      'gcloud',
      true,
      true,
    );
  } catch (err) {
    throw new Error(
      `Failed to route 100% traffic to ${revision} for service ${service}: ${err.message}`,
      { cause: err },
    );
  }
};

/**
 * Wait until the revision serves 100% of the traffic in status.traffic.
 * Traffic is checked, not the Active condition of the revision.
 */
const waitForFullTraffic = async (
  service,
  projectID,
  region,
  revision,
  timeoutMillis = TRAFFIC_TIMEOUT_MILLIS,
) => {
  try {
    await retryUntil(
      () => getTrafficSplit(service, projectID, region),
      (traffic) =>
        traffic.some((t) => t.revisionName === revision && t.percent === 100),
      timeoutMillis,
    );
  } catch (err) {
    throw new Error(
      `Revision ${revision} did not reach 100% traffic for service ${service}: ${err.message}`,
      { cause: err },
    );
  }
};

/**
 * Delete a revision and wait until it is gone from the revision list, so it
 * no longer counts as an active revision when the manifest is built.
 * A revision that is already gone counts as deleted.
 */
const deleteRevision = async (
  service,
  projectID,
  region,
  revision,
  timeoutMillis = TRAFFIC_TIMEOUT_MILLIS,
) => {
  const isListed = async () =>
    (await getRevisions(service, projectID, region)).some(
      (r) => r.name === revision,
    );
  try {
    if (!(await isListed())) {
      return;
    }
    try {
      await gcloudOutput(
        [
          'run',
          'revisions',
          'delete',
          revision,
          `--project=${projectID}`,
          `--region=${region}`,
          '--quiet',
        ],
        'gcloud',
        true,
        true,
      );
    } catch (err) {
      // A concurrent delete leaves the revision gone, which is what we want.
      if (await isListed()) {
        throw err;
      }
      return;
    }
    await retryUntil(
      () => getRevisions(service, projectID, region),
      (revisions) => !revisions.some((r) => r.name === revision),
      timeoutMillis,
    );
  } catch (err) {
    throw new Error(
      `Failed to delete canary revision ${revision} of service ${service}: ${err.message}`,
      { cause: err },
    );
  }
};

export {
  deleteRevision,
  getNewRevision,
  getPreviousRevision,
  getTrafficSplit,
  shiftTrafficToRevision,
  waitForFullTraffic,
};
