import * as core from '@actions/core';

import getRevisions from '../cloudrun/get-revisions.js';
import {
  deleteRevision,
  getTrafficSplit,
  shiftTrafficToRevision,
  waitForFullTraffic,
} from './canary-revisions.js';
import { cancelAutomaticCanary } from './send-request.js';

const serving = (traffic) => traffic.filter((t) => t.percent > 0);

const percentOf = (traffic, revision) =>
  traffic.find((t) => t.revisionName === revision)?.percent ?? 0;

const assertAtMostTwoServing = (service, traffic) => {
  const live = serving(traffic);
  if (live.length > 2) {
    throw new Error(
      `Cannot determine the stable revision for ${service}: ${live.length} revisions serve traffic (${live
        .map((t) => `${t.revisionName}=${t.percent}%`)
        .join(', ')}). Resolve the traffic split manually`,
    );
  }
};

/**
 * The record is usable when its stable revision serves traffic and no other
 * revision than its canary serves traffic.
 */
const recordMatchesTraffic = (record, traffic) => {
  if (
    !record.previous_revision ||
    percentOf(traffic, record.previous_revision) <= 0
  ) {
    return false;
  }
  return serving(traffic).every(
    (t) =>
      t.revisionName === record.previous_revision ||
      t.revisionName === record.revision,
  );
};

/**
 * Fallback when the database record cannot be used: the oldest revision that
 * still serves traffic is stable and the other serving revision is the canary.
 */
const oldestServingFallback = async (service, project, region, traffic) => {
  const live = serving(traffic);
  if (live.length === 0) {
    throw new Error(
      `Cannot determine the stable revision for ${service}: no revision serves traffic`,
    );
  }
  assertAtMostTwoServing(service, traffic);
  if (live.length === 1) {
    return { stable: live[0].revisionName, canaries: [] };
  }
  const revisions = await getRevisions(service, project, region);
  const dated = live.map((t) => {
    const rev = revisions.find((r) => r.name === t.revisionName);
    // A missing or unparsable timestamp gives NaN, which is not > 0.
    const time = Date.parse(rev?.creationTimestamp ?? '');
    if (time > 0) {
      return { name: t.revisionName, time };
    }
    throw new Error(
      `Cannot determine the stable revision for ${service}: no creation time for ${t.revisionName}`,
    );
  });
  dated.sort((a, b) => a.time - b.time);
  return {
    stable: dated[0].name,
    canaries: dated.slice(1).map((d) => d.name),
  };
};

/**
 * A canary is in progress and a new deploy starts. Cancel the canary in the
 * platform API first, then route all traffic to the stable revision, wait for
 * it and delete the canary revision. Returns the stable revision.
 *
 * The stable and canary revisions come from the cancelled record. The record
 * is stale when its stable revision no longer serves traffic, and then the
 * oldest serving revision is used instead.
 */
const supersedeCanary = async ({
  service,
  project,
  region = 'europe-west1',
  supersededBy,
}) => {
  const cancelled = await cancelAutomaticCanary(
    service,
    project,
    region,
    supersededBy,
  );
  const traffic = await getTrafficSplit(service, project, region);
  assertAtMostTwoServing(service, traffic);

  let plan;
  if (cancelled === null) {
    core.info('No automatic canary in progress to cancel');
    const full = traffic.find((t) => t.percent === 100);
    if (full) {
      core.info(
        `Revision ${full.revisionName} already serves 100% traffic, nothing to supersede`,
      );
      return full.revisionName;
    }
    plan = await oldestServingFallback(service, project, region, traffic);
  } else if (recordMatchesTraffic(cancelled, traffic)) {
    plan = {
      stable: cancelled.previous_revision,
      canaries: cancelled.revision ? [cancelled.revision] : [],
    };
  } else {
    core.warning(
      `Canary record does not match the live traffic (stable revision ${cancelled.previous_revision ?? '(none)'}, canary revision ${cancelled.revision ?? '(none)'}), using the oldest serving revision`,
    );
    plan = await oldestServingFallback(service, project, region, traffic);
  }

  const { stable, canaries } = plan;
  core.warning(
    `New deploy supersedes the canary in progress: cancelling ${canaries.join(', ') || 'no canary revision'}, keeping stable revision ${stable}`,
  );

  await shiftTrafficToRevision(service, project, region, stable);
  await waitForFullTraffic(service, project, region, stable);

  // assertAtMostTwoServing leaves at most one canary.
  const [canary] = canaries;
  if (canary) {
    // Never delete a revision that still serves traffic.
    const current = await getTrafficSplit(service, project, region);
    if (percentOf(current, canary) > 0) {
      throw new Error(
        `Refusing to delete canary revision ${canary} of service ${service}: it still serves ${percentOf(current, canary)}% traffic`,
      );
    }
    try {
      await deleteRevision(service, project, region, canary);
    } catch (err) {
      throw new Error(
        `${err.message}. Traffic is safe on stable revision ${stable}.`,
        { cause: err },
      );
    }
  }
  return stable;
};

export default supersedeCanary;
