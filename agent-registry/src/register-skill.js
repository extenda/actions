import * as core from '@actions/core';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { upload } from './upload-gcs.js';

const PROJECT = 'extenda';
const LOCATION = 'eu';

const parseSkillMeta = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: '', description: '' };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  }
  return { name: meta['name'] ?? '', description: meta['description'] ?? '' };
};

// The registry requires a zip archive containing SKILL.md.
const makeZipFile = (skillFilePath) => {
  const content = readFileSync(skillFilePath);
  const zipped = zipSync({ 'SKILL.md': [strToU8(content.toString()), { level: 6 }] });
  const tmpPath = path.join(tmpdir(), `skill-${process.pid}.zip`);
  writeFileSync(tmpPath, Buffer.from(zipped));
  return tmpPath;
};

const skillExists = async (skillId) => {
  try {
    core.info(`[skill] checking exists: ${skillId} @ ${LOCATION}`);
    await execGcloud(
      ['alpha', 'agent-registry', 'skills', 'describe', skillId,
        `--location=${LOCATION}`, `--project=${PROJECT}`, '--quiet'],
      'gcloud', true,
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
    const output = await execGcloud([
      'alpha', 'agent-registry', 'skills', 'revisions', 'list',
      `--skill=${registryId}`, `--location=${LOCATION}`, `--project=${PROJECT}`,
      '--format=value(name.basename())', '--quiet',
    ], 'gcloud', true);
    const versions = output
      .split('\n')
      .filter(Boolean)
      .filter((v) => /^v\d+-\d+$/.test(v));
    if (!versions.length) return null;
    return versions.sort((a, b) => {
      const [aMaj, aMin] = a.slice(1).split('-').map(Number);
      const [bMaj, bMin] = b.slice(1).split('-').map(Number);
      return aMaj - bMaj || aMin - bMin;
    }).at(-1);
  } catch { return null; }
};

const isMajorBranch = () => {
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
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
  await execGcloud([
    'alpha', 'agent-registry', 'skills', 'update', registryId,
    `--location=${LOCATION}`, `--project=${PROJECT}`,
    `--default-revision=${revisionName}`,
    '--target-state=active', '--quiet',
  ], 'gcloud', true);
};

const registerSkill = async (skillId, skillFilePath, dryRun, clan) => {
  const skillContent = readFileSync(skillFilePath, 'utf8');
  const { name: displayName, description } = parseSkillMeta(skillContent);
  if (!displayName) throw new Error(`SKILL.md for '${skillId}' is missing required frontmatter field: name`);
  if (!description) throw new Error(`SKILL.md for '${skillId}' is missing required frontmatter field: description`);
  const body = skillContent.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
  if (!body) throw new Error(`SKILL.md for '${skillId}' must have instructions after the frontmatter`);
  const namespacedId = clan ? `${clan}-${skillId}` : skillId;
  const registryId = `private-${namespacedId}`;

  if (dryRun) {
    core.info(`[dry-run] Would register skill: ${registryId}`);
    return;
  }

  const exists = await skillExists(registryId);
  const currentVersion = exists ? await getLatestRevision(registryId) : null;
  const version = currentVersion ? bumpVersion(currentVersion) : 'v0-01';
  const revisionId = version;

  if (!exists) {
    core.info(`Creating skill: ${registryId}@${version}`);
    // gcloud auto-prepends "private-" to the skill name, so we pass namespacedId (not registryId)
    await execGcloud([
      'alpha', 'agent-registry', 'skills', 'create', namespacedId,
      `--location=${LOCATION}`, `--project=${PROJECT}`,
      `--display-name=${displayName}`, `--description=${description}`,
      '--type=simple', '--quiet',
    ], 'gcloud', true);
  }

  const zipPath = makeZipFile(skillFilePath);
  try {
    core.info(`${exists ? 'Adding' : 'Uploading'} revision ${version} to skill: ${registryId}`);
    await execGcloud([
      'alpha', 'agent-registry', 'skills', 'revisions', 'create', revisionId,
      `--skill=${registryId}`,
      `--location=${LOCATION}`, `--project=${PROJECT}`,
      `--payload=${zipPath}`, '--quiet',
    ], 'gcloud', true);
  } finally {
    unlinkSync(zipPath);
  }

  await activate(registryId, revisionId);
  const gcsPath = await upload(skillFilePath, `skills/${namespacedId}/${revisionId}/SKILL.md`);
  core.info(`Skill registered: ${registryId}@${version} → ${gcsPath}`);
};

export { parseSkillMeta, registerSkill };
