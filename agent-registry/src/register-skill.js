import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as core from '@actions/core';
import fg from 'fast-glob';
import { strToU8, zipSync } from 'fflate';
import { load as yamlLoad } from 'js-yaml';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { upload } from './upload-gcs.js';

const PROJECT = 'extenda';
const LOCATION = 'eu';
const MAX_DESCRIPTION_LENGTH = 1024;
// Registry/agent limits for published skills. Exceeding any of them fails the skill before anything is written.
const MAX_MARKDOWN_BYTES = 64 * 1024;
const MAX_ZIP_BYTES = 400 * 1024;
const MAX_FILES = 150;
// The registry allows 100 revisions per skill; keep the newest KEEP_REVISIONS and prune the rest.
const KEEP_REVISIONS = 20;
// Real gcloud output, as in delete-skills.js: registry 'NOT_FOUND: ...', GCS 'The following URLs matched no objects'.
const NOT_FOUND = /NOT_FOUND|matched no objects/;
const REVISION_PATTERN = /^v\d+-\d+$/;

const asTrimmedString = (value) => (value == null ? '' : String(value).trim());

const parseSkillMeta = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: '', description: '' };
  const meta = yamlLoad(match[1]) ?? {};
  return {
    name: asTrimmedString(meta.name),
    description: asTrimmedString(meta.description),
  };
};

// Every file in the skill directory other than SKILL.md (e.g. references/**), as posix paths relative to it.
const listReferenceFiles = (skillDir) =>
  (
    fg.sync('**/*', {
      cwd: skillDir,
      onlyFiles: true,
      dot: true,
      // Never publish files outside the skill directory through symlinks.
      followSymbolicLinks: false,
      ignore: ['SKILL.md', '**/.DS_Store'],
    }) ?? []
  ).sort();

// The registry requires a zip archive containing SKILL.md and any reference files at their relative paths.
const buildZip = (skillFilePath, referenceFiles = []) => {
  const skillDir = path.dirname(skillFilePath);
  const content = readFileSync(skillFilePath);
  const entries = { 'SKILL.md': [strToU8(content.toString()), { level: 6 }] };
  for (const rel of referenceFiles) {
    entries[rel] = [
      new Uint8Array(readFileSync(path.join(skillDir, rel))),
      { level: 6 },
    ];
  }
  return zipSync(entries);
};

const writeZipFile = (zipped) => {
  const tmpPath = path.join(tmpdir(), `skill-${process.pid}.zip`);
  writeFileSync(tmpPath, Buffer.from(zipped));
  return tmpPath;
};

// Fails (throws) on the first exceeded limit, naming the file or size, so nothing is created or uploaded.
const checkFileLimits = (skillId, skillContent, skillDir, referenceFiles) => {
  const total = referenceFiles.length + 1;
  if (total > MAX_FILES) {
    throw new Error(
      `Skill '${skillId}' has ${total} files (SKILL.md plus references), max is ${MAX_FILES}`,
    );
  }
  const skillMdBytes = Buffer.byteLength(skillContent);
  if (skillMdBytes > MAX_MARKDOWN_BYTES) {
    throw new Error(
      `Skill '${skillId}': SKILL.md is ${skillMdBytes} bytes, max for a Markdown file is ${MAX_MARKDOWN_BYTES}`,
    );
  }
  for (const rel of referenceFiles.filter((f) => /\.md$/i.test(f))) {
    const bytes = Buffer.byteLength(readFileSync(path.join(skillDir, rel)));
    if (bytes > MAX_MARKDOWN_BYTES) {
      throw new Error(
        `Skill '${skillId}': ${rel} is ${bytes} bytes, max for a Markdown file is ${MAX_MARKDOWN_BYTES}`,
      );
    }
  }
};

const checkZipLimit = (skillId, zipped) => {
  if (zipped.length > MAX_ZIP_BYTES) {
    throw new Error(
      `Skill '${skillId}': payload zip is ${zipped.length} bytes, max is ${MAX_ZIP_BYTES}`,
    );
  }
};

const skillExists = async (skillId) => {
  try {
    core.info(`[skill] checking exists: ${skillId} @ ${LOCATION}`);
    await execGcloud(
      [
        'alpha',
        'agent-registry',
        'skills',
        'describe',
        skillId,
        `--location=${LOCATION}`,
        `--project=${PROJECT}`,
        '--quiet',
      ],
      'gcloud',
      true,
    );
    core.info(`[skill] exists: true`);
    return true;
  } catch (e) {
    core.info(`[skill] exists: false (${e.message?.split('\n')[0]})`);
    return false;
  }
};

// Revision IDs in GCP must start with the skill name: {registryId}-{version}
// e.g. private-fix-dependabot-pr-v0-1. We extract just the version suffix for tracking.
const getLatestRevision = async (registryId) => {
  try {
    core.info(`[skill] fetching latest revision for: ${registryId}`);
    const output = await execGcloud(
      [
        'alpha',
        'agent-registry',
        'skills',
        'revisions',
        'list',
        `--skill=${registryId}`,
        `--location=${LOCATION}`,
        `--project=${PROJECT}`,
        '--format=value(name.basename())',
        '--quiet',
      ],
      'gcloud',
      true,
    );
    const versions = output
      .split('\n')
      .filter(Boolean)
      .filter((v) => /^v\d+-\d+$/.test(v));
    if (!versions.length) return null;
    return versions
      .sort((a, b) => {
        const [aMaj, aMin] = a.slice(1).split('-').map(Number);
        const [bMaj, bMin] = b.slice(1).split('-').map(Number);
        return aMaj - bMaj || aMin - bMin;
      })
      .at(-1);
  } catch {
    return null;
  }
};

const compareVersions = (a, b) => {
  const [aMaj, aMin] = a.slice(1).split('-').map(Number);
  const [bMaj, bMin] = b.slice(1).split('-').map(Number);
  return aMaj - bMaj || aMin - bMin;
};

const isMajorBranch = () => {
  const branch =
    process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
  return /^(breaking|major)(\/|$)/i.test(branch);
};

const bumpVersion = (version) => {
  const [major, minor] = version.slice(1).split('-').map(Number);
  return isMajorBranch()
    ? `v${major + 1}-00`
    : `v${major}-${String(minor + 1).padStart(2, '0')}`;
};

const activate = async (registryId, revisionId) => {
  const revisionName = `projects/${PROJECT}/locations/${LOCATION}/skills/${registryId}/revisions/${revisionId}`;
  await execGcloud(
    [
      'alpha',
      'agent-registry',
      'skills',
      'update',
      registryId,
      `--location=${LOCATION}`,
      `--project=${PROJECT}`,
      `--default-revision=${revisionName}`,
      '--target-state=active',
      '--quiet',
    ],
    'gcloud',
    true,
  );
};

// Runs BEFORE the new revision is created, so a skill at the registry's revision cap can still get a new one:
// afterwards at most KEEP_REVISIONS - 1 old revisions remain and the new revision makes KEEP_REVISIONS.
// Never deletes the default (active) revision.
// Failures only warn: a registered skill must not fail the run because old revisions could not be pruned.
const pruneRevisions = async (registryId, namespacedId, dryRun) => {
  try {
    const output = await execGcloud(
      [
        'alpha',
        'agent-registry',
        'skills',
        'revisions',
        'list',
        `--skill=${registryId}`,
        `--location=${LOCATION}`,
        `--project=${PROJECT}`,
        '--format=value(name.basename())',
        '--quiet',
      ],
      'gcloud',
      true,
    );
    const defaultRevision = (
      (await execGcloud(
        [
          'alpha',
          'agent-registry',
          'skills',
          'describe',
          registryId,
          `--location=${LOCATION}`,
          `--project=${PROJECT}`,
          '--format=value(defaultRevision.basename())',
          '--quiet',
        ],
        'gcloud',
        true,
      )) ?? ''
    ).trim();
    const all = [
      ...new Set(
        (output ?? '')
          .split('\n')
          .map((v) => v.trim())
          .filter((v) => REVISION_PATTERN.test(v)),
      ),
    ].sort(compareVersions);
    // One slot is reserved for the revision about to be created.
    const stale = all
      .slice(0, Math.max(0, all.length + 1 - KEEP_REVISIONS))
      .filter((r) => r !== defaultRevision);
    for (const revision of stale) {
      const prefix = `gs://extenda-agent-artifacts/skills/${namespacedId}/${revision}/`;
      if (dryRun) {
        core.info(
          `[dry-run] Would prune revision ${registryId}@${revision} and ${prefix}`,
        );
        continue;
      }
      try {
        // Registry first, then artifacts, as in delete-skills.js.
        await execGcloud(
          [
            'alpha',
            'agent-registry',
            'skills',
            'revisions',
            'delete',
            revision,
            `--skill=${registryId}`,
            `--location=${LOCATION}`,
            `--project=${PROJECT}`,
            '--quiet',
          ],
          'gcloud',
          true,
        );
        try {
          await execGcloud(['storage', 'rm', '-r', prefix], 'gcloud', true);
        } catch (e) {
          // A prefix that is already gone is success (a revision without artifacts, or a rerun).
          if (!NOT_FOUND.test(e.message ?? '')) throw e;
        }
        core.info(`Pruned revision ${registryId}@${revision}`);
      } catch (e) {
        core.warning(
          `Could not prune ${registryId}@${revision}: ${e.message?.split('\n')[0]}`,
        );
      }
    }
  } catch (e) {
    // A skill that does not exist yet has nothing to prune.
    if (NOT_FOUND.test(e.message ?? '')) return;
    const log = dryRun ? core.info : core.warning;
    log(
      `${dryRun ? '[dry-run] ' : ''}Could not prune old revisions of ${registryId}: ${e.message?.split('\n')[0]}`,
    );
  }
};

const registerSkill = async (skillId, skillFilePath, dryRun, clan) => {
  const skillContent = readFileSync(skillFilePath, 'utf8');
  let meta;
  try {
    meta = parseSkillMeta(skillContent);
  } catch (e) {
    throw new Error(
      `SKILL.md for '${skillId}' has invalid YAML frontmatter: ${e.message.split('\n')[0]}`,
    );
  }
  const { name: displayName, description } = meta;
  if (!displayName)
    throw new Error(
      `SKILL.md for '${skillId}' is missing required frontmatter field: name`,
    );
  if (!description)
    throw new Error(
      `SKILL.md for '${skillId}' is missing required frontmatter field: description`,
    );
  // Count code points, not UTF-16 units, so emoji and other astral characters count as one.
  const descriptionLength = [...description].length;
  if (descriptionLength > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `SKILL.md for '${skillId}': description is ${descriptionLength} chars, max is ${MAX_DESCRIPTION_LENGTH}`,
    );
  }
  const body = skillContent.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
  if (!body)
    throw new Error(
      `SKILL.md for '${skillId}' must have instructions after the frontmatter`,
    );
  const skillDir = path.dirname(skillFilePath);
  const referenceFiles = listReferenceFiles(skillDir);
  const namespacedId = clan ? `${clan}-${skillId}` : skillId;
  const registryId = `private-${namespacedId}`;

  // Limits are checked before anything is created or uploaded, in dry-run too.
  checkFileLimits(skillId, skillContent, skillDir, referenceFiles);
  const zipped = buildZip(skillFilePath, referenceFiles);
  checkZipLimit(skillId, zipped);

  if (dryRun) {
    core.info(`[dry-run] Would register skill: ${registryId}`);
    if (referenceFiles.length)
      core.info(
        `[dry-run] Would include ${referenceFiles.length} reference file(s): ${referenceFiles.join(', ')}`,
      );
    await pruneRevisions(registryId, namespacedId, true);
    return;
  }

  const exists = await skillExists(registryId);
  const currentVersion = exists ? await getLatestRevision(registryId) : null;
  // Make room first: a skill at the registry's revision cap could not otherwise get a new revision.
  if (exists) await pruneRevisions(registryId, namespacedId, false);
  const version = currentVersion ? bumpVersion(currentVersion) : 'v0-01';
  const revisionId = version;

  if (!exists) {
    core.info(`Creating skill: ${registryId}@${version}`);
    // gcloud auto-prepends "private-" to the skill name, so we pass namespacedId (not registryId)
    await execGcloud(
      [
        'alpha',
        'agent-registry',
        'skills',
        'create',
        namespacedId,
        `--location=${LOCATION}`,
        `--project=${PROJECT}`,
        `--display-name=${displayName}`,
        `--description=${description}`,
        '--type=simple',
        '--quiet',
      ],
      'gcloud',
      true,
    );
  }

  const zipPath = writeZipFile(zipped);
  try {
    core.info(
      `${exists ? 'Adding' : 'Uploading'} revision ${version} to skill: ${registryId}`,
    );
    await execGcloud(
      [
        'alpha',
        'agent-registry',
        'skills',
        'revisions',
        'create',
        revisionId,
        `--skill=${registryId}`,
        `--location=${LOCATION}`,
        `--project=${PROJECT}`,
        `--payload=${zipPath}`,
        '--quiet',
      ],
      'gcloud',
      true,
    );
  } finally {
    unlinkSync(zipPath);
  }

  // Upload every GCS artifact before activating so a failed upload never leaves an incomplete active revision.
  // Each revision has its own GCS prefix, so files removed from the skill do not linger.
  const revisionPrefix = `skills/${namespacedId}/${revisionId}`;
  const gcsPath = await upload(skillFilePath, `${revisionPrefix}/SKILL.md`);
  for (const rel of referenceFiles) {
    await upload(path.join(skillDir, rel), `${revisionPrefix}/${rel}`);
  }
  await activate(registryId, revisionId);
  core.info(
    `Skill registered: ${registryId}@${version} → ${gcsPath}${referenceFiles.length ? ` (+${referenceFiles.length} reference file(s))` : ''}`,
  );
};

export {
  KEEP_REVISIONS,
  listReferenceFiles,
  MAX_FILES,
  MAX_MARKDOWN_BYTES,
  MAX_ZIP_BYTES,
  parseSkillMeta,
  registerSkill,
};
