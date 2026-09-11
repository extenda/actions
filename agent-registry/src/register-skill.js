import * as core from '@actions/core';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

const PROJECT = 'extenda';
const LOCATION = 'eu';

const logGcloudVersion = () => {
  try {
    const version = execSync('gcloud version --format=value(Google Cloud SDK)', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    core.info(`[skill] gcloud version: ${version}`);
  } catch {
    core.info('[skill] gcloud version: unknown');
  }
};

const withTimeout = (promise, ms, label) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`[skill] timed out after ${ms / 1000}s: ${label}`)), ms),
  );
  return Promise.race([promise, timeout]);
};

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
  const args = ['alpha', 'agent-registry', 'skills', 'describe', skillId,
    `--location=${LOCATION}`, `--project=${PROJECT}`, '--quiet'];
  core.info(`[skill] running: gcloud ${args.join(' ')}`);
  try {
    await withTimeout(execGcloud(args, 'gcloud', true), 30_000, `skills describe ${skillId}`);
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
    const args = ['alpha', 'agent-registry', 'skills', 'revisions', 'list',
      `--skill=${registryId}`, `--location=${LOCATION}`, `--project=${PROJECT}`,
      '--format=value(name)', '--quiet'];
    core.info(`[skill] running: gcloud ${args.join(' ')}`);
    const output = await withTimeout(execGcloud(args, 'gcloud', true), 30_000, `skills revisions list ${registryId}`);
    const prefix = `${registryId}-`;
    const versions = output
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('/revisions/').pop())
      .filter((name) => name.startsWith(prefix))
      .map((name) => name.slice(prefix.length))
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
  return isMajorBranch() ? `v${major + 1}-0` : `v${major}-${minor + 1}`;
};

const activate = async (registryId, revisionId) => {
  const revisionName = `projects/${PROJECT}/locations/${LOCATION}/skills/${registryId}/revisions/${revisionId}`;
  const args = ['alpha', 'agent-registry', 'skills', 'update', registryId,
    `--location=${LOCATION}`, `--project=${PROJECT}`,
    `--default-revision=${revisionName}`, '--target-state=active', '--quiet'];
  core.info(`[skill] running: gcloud ${args.join(' ')}`);
  await withTimeout(execGcloud(args), 60_000, `skills update (activate) ${registryId}`);
};

const registerSkill = async (skillId, skillFilePath, dryRun) => {
  const skillContent = readFileSync(skillFilePath, 'utf8');
  const { name: displayName, description } = parseSkillMeta(skillContent);
  if (!displayName) throw new Error(`SKILL.md for '${skillId}' is missing required frontmatter field: name`);
  if (!description) throw new Error(`SKILL.md for '${skillId}' is missing required frontmatter field: description`);
  const registryId = `private-${skillId}`;

  if (dryRun) {
    core.info(`[dry-run] Would register skill: ${registryId}`);
    return;
  }

  logGcloudVersion();
  const exists = await skillExists(registryId);
  const currentVersion = exists ? await getLatestRevision(registryId) : null;
  const version = currentVersion ? bumpVersion(currentVersion) : 'v0-1';
  const revisionId = `${registryId}-${version}`;

  if (!exists) {
    core.info(`Creating skill: ${registryId}@${version}`);
    // gcloud auto-prepends "private-" to the skill name, so we pass skillId (not registryId)
    const createArgs = ['alpha', 'agent-registry', 'skills', 'create', skillId,
      `--location=${LOCATION}`, `--project=${PROJECT}`,
      `--display-name=${displayName}`, `--description=${description}`,
      '--type=simple', '--quiet'];
    core.info(`[skill] running: gcloud ${createArgs.join(' ')}`);
    await withTimeout(execGcloud(createArgs), 60_000, `skills create ${skillId}`);
  }

  const zipPath = makeZipFile(skillFilePath);
  try {
    core.info(`${exists ? 'Adding' : 'Uploading'} revision ${version} to skill: ${registryId}`);
    const revCreateArgs = ['alpha', 'agent-registry', 'skills', 'revisions', 'create', revisionId,
      `--skill=${registryId}`, `--location=${LOCATION}`, `--project=${PROJECT}`,
      `--payload=${zipPath}`, '--quiet'];
    core.info(`[skill] running: gcloud ${revCreateArgs.join(' ')}`);
    await withTimeout(execGcloud(revCreateArgs), 60_000, `skills revisions create ${revisionId}`);
  } finally {
    unlinkSync(zipPath);
  }

  await activate(registryId, revisionId);
  core.info(`Skill registered: ${registryId}@${version}`);
};

export { parseSkillMeta, registerSkill };
