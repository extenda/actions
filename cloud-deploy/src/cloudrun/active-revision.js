import * as core from '@actions/core';

import { getPreviousRevision } from '../utils/canary-revisions.js';
import {
  getAutomaticCanary,
  setRevisionTraffic,
} from '../utils/send-request.js';
import getRevisions from './get-revisions.js';

const MULTIPLE_ACTIVE_REVISIONS =
  '2 active revisions found, set revision to 100% traffic before deploying';

/**
 * Read the automatic canary of the service.
 * @returns the canary record, null if the service has none,
 *          or undefined if platform-api gives no answer
 */
const readAutomaticCanary = async (service, project, region) =>
  getAutomaticCanary(service, project, region).catch((err) => {
    core.warning(
      `Unable to read the canary status from platform-api: ${err.message}. Checking active revisions only.`,
    );
    return undefined;
  });

const describeStep = ({ steps, step_index: stepIndex }) => {
  if (stepIndex < 0) {
    return 'waiting for its first step';
  }
  try {
    const percentages = JSON.parse(steps);
    return `at step ${stepIndex + 1} of ${percentages.length} (${percentages[stepIndex]}% traffic)`;
  } catch {
    return `at step ${stepIndex + 1}`;
  }
};

/**
 * Give all traffic to the serving revision when the other active revision
 * has no traffic. A deploy that stops before its canary is registered
 * leaves the service in this state.
 * @returns the serving revision name
 * @throws Error if the traffic is split, or if it could not be read or set
 */
const dropIdleRevision = async (service, project, region, activeRevisions) => {
  // A revision with 100% of the traffic leaves 0% to the other one.
  const servingRevision = await getPreviousRevision(
    service,
    project,
    region,
  ).catch((err) => {
    throw new Error(
      `${MULTIPLE_ACTIVE_REVISIONS}. Unable to read the traffic of the service: ${err.message}`,
    );
  });
  if (!activeRevisions.includes(servingRevision)) {
    throw new Error(MULTIPLE_ACTIVE_REVISIONS);
  }
  core.notice(
    `Found an active revision without traffic and no canary in progress. Set 100% traffic to ${servingRevision}`,
  );
  await setRevisionTraffic(service, project, region, [
    { name: servingRevision, trafficPercent: 100 },
  ]).catch((err) => {
    throw new Error(
      `${MULTIPLE_ACTIVE_REVISIONS}. Unable to set 100% traffic to ${servingRevision}: ${err.message}`,
    );
  });
  return servingRevision;
};

/**
 * Make sure that one revision has all traffic before a new revision is
 * deployed without traffic. This sets the traffic of the service when an
 * active revision is left without traffic and without a canary.
 * @param automaticCanary true if the platform shifts traffic to new revisions
 *                        of this service
 * @returns {Promise<string>} the name of the revision with all traffic, or an
 *                            empty string if the service has no active revision
 * @throws Error if a canary is in progress, or if more than one revision stays active
 */
const ensureSingleActiveRevision = async (
  service,
  project,
  region,
  automaticCanary = false,
) => {
  // Read the canary first. Without a canary in progress, the platform does
  // not move traffic after this point.
  const canary = await readAutomaticCanary(service, project, region);
  if (canary?.status === 'in_progress') {
    throw new Error(
      `A canary is in progress for revision ${canary.revision}, ${describeStep(canary)}. ` +
        'Deploy again when it has finished. ' +
        'If it never ends, set the traffic of the service in the platform UI (POST /services/revisions): this cancels the canary.',
    );
  }

  const activeRevisions = await getRevisions(service, project, region).then(
    (revisions) =>
      revisions
        .filter((revision) => revision.active === true)
        .map((revision) => revision.name),
  );

  if (activeRevisions.length > 1) {
    // Only repair when platform-api confirmed that no canary is in progress.
    if (
      automaticCanary &&
      canary !== undefined &&
      activeRevisions.length === 2
    ) {
      return dropIdleRevision(service, project, region, activeRevisions);
    }
    throw new Error(MULTIPLE_ACTIVE_REVISIONS);
  }

  return activeRevisions[0] ?? '';
};

export default ensureSingleActiveRevision;
