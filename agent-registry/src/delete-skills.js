import * as core from '@actions/core';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

const PROJECT = 'extenda';
const LOCATION = 'eu';
const GCS = 'gs://extenda-agent-artifacts';

// Deleting something that is already gone must not fail, so reruns are idempotent. Real gcloud output:
//   registry: "NOT_FOUND: Resource '...' was not found."
//   GCS:      "The following URLs matched no objects or files: gs://..."
// FAILED_PRECONDITION (e.g. skill still has revisions) is deliberately not matched and rethrows.
const NOT_FOUND = /NOT_FOUND|matched no objects/;

const isNotFound = (e) => NOT_FOUND.test(e.message ?? '');

const ignoreNotFound = async (args, description) => {
  try {
    await execGcloud(args, 'gcloud', true);
    core.info(`Deleted ${description}`);
  } catch (e) {
    if (!isNotFound(e)) throw e;
    core.info(`Already gone: ${description}`);
  }
};

const lines = (out) =>
  (out || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const registryFlags = [`--location=${LOCATION}`, `--project=${PROJECT}`];

// Returns null when the skill no longer exists, otherwise its revision ids with the default one last.
// The registry refuses to delete a skill that still has revisions (FAILED_PRECONDITION). Verified live:
// the default revision can be deleted while still default, so clearing it is not needed; it goes last anyway.
// `revisions list` on a missing skill returns empty (exit 0) rather than an error, hence the describe check.
const getRevisionsToDelete = async (registryId) => {
  let defaultRevision;
  try {
    defaultRevision = await execGcloud(
      [
        'alpha',
        'agent-registry',
        'skills',
        'describe',
        registryId,
        ...registryFlags,
        '--format=value(defaultRevision.basename())',
        '--quiet',
      ],
      'gcloud',
      true,
    );
  } catch (e) {
    if (!isNotFound(e)) throw e;
    return null;
  }
  let revisions;
  try {
    revisions = lines(
      await execGcloud(
        [
          'alpha',
          'agent-registry',
          'skills',
          'revisions',
          'list',
          `--skill=${registryId}`,
          ...registryFlags,
          '--format=value(name.basename())',
          '--quiet',
        ],
        'gcloud',
        true,
      ),
    );
  } catch (e) {
    if (!isNotFound(e)) throw e;
    return null;
  }
  const def = (defaultRevision || '').trim();
  return [
    ...revisions.filter((r) => r !== def),
    ...revisions.filter((r) => r === def),
  ];
};

/**
 * Delete skills that were removed from the repository in this change.
 * Ids are derived exactly as in registerSkill: `private-<clan>-<skillId>` in the registry and
 * `skills/<clan>-<skillId>/` in GCS, so only resources this clan registered can be touched.
 * @param {string[]} skillIds ids (without clan prefix) whose SKILL.md was deleted
 * @param {boolean} dryRun log instead of deleting
 * @param {string} clan clan namespace of this repository
 */
const deleteSkills = async (skillIds, dryRun, clan) => {
  if (!skillIds.length) {
    core.info('No deleted skills to remove');
    return [];
  }
  if (!clan) {
    core.warning('Skipping skill deletion: clan namespace is empty');
    return [];
  }

  for (const skillId of skillIds) {
    const namespacedId = `${clan}-${skillId}`;
    const registryId = `private-${namespacedId}`;
    const gcsPrefix = `${GCS}/skills/${namespacedId}/`;
    if (dryRun) {
      let revisions = [];
      try {
        revisions = (await getRevisionsToDelete(registryId)) ?? [];
      } catch (e) {
        // A dry-run check (e.g. on a PR) must not fail because the registry could not be read.
        core.warning(
          `[dry-run] Could not list revisions for ${registryId}: ${e.message?.split('\n')[0]}`,
        );
      }
      for (const revision of revisions) {
        core.info(`[dry-run] Would delete revision ${registryId}@${revision}`);
      }
      core.info(`[dry-run] Would delete skill ${registryId} and ${gcsPrefix}`);
      continue;
    }
    // Revisions first (the registry rejects deleting a skill that still has them), then the skill, then artifacts.
    const revisions = await getRevisionsToDelete(registryId);
    if (revisions) {
      for (const revision of revisions) {
        await ignoreNotFound(
          [
            'alpha',
            'agent-registry',
            'skills',
            'revisions',
            'delete',
            revision,
            `--skill=${registryId}`,
            ...registryFlags,
            '--quiet',
          ],
          `revision ${registryId}@${revision}`,
        );
      }
      await ignoreNotFound(
        [
          'alpha',
          'agent-registry',
          'skills',
          'delete',
          registryId,
          ...registryFlags,
          '--quiet',
        ],
        `registry skill ${registryId}`,
      );
    } else {
      core.info(`Already gone: registry skill ${registryId}`);
    }
    await ignoreNotFound(['storage', 'rm', '-r', gcsPrefix], gcsPrefix);
  }
  return skillIds;
};

export { deleteSkills };
