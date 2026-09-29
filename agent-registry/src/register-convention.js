import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as core from '@actions/core';

import { listFiles } from './list-files.js';
import { parseSkillMeta } from './register-skill.js';
import { upload, uploadDir } from './upload-gcs.js';

const CONVENTION_FILE = 'CONVENTIONS.md';

const conventionPrefix = (clan, conventionId) =>
  `conventions/${clan}/${conventionId}`;

// Validates a conventions/<id>/ directory and returns its metadata and file list.
const readConvention = (conventionId, conventionDir) => {
  const files = listFiles(conventionDir);
  if (!files.includes(CONVENTION_FILE)) {
    throw new Error(
      `Convention directory '${conventionId}' is missing required file: ${CONVENTION_FILE}`,
    );
  }
  const content = readFileSync(
    path.join(conventionDir, CONVENTION_FILE),
    'utf8',
  );
  const { name, description } = parseSkillMeta(content);
  if (!name)
    throw new Error(
      `${CONVENTION_FILE} for '${conventionId}' is missing required frontmatter field: name`,
    );
  if (!description)
    throw new Error(
      `${CONVENTION_FILE} for '${conventionId}' is missing required frontmatter field: description`,
    );
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
  if (!body)
    throw new Error(
      `${CONVENTION_FILE} for '${conventionId}' must have content after the frontmatter`,
    );
  return { name, description, files };
};

// Uploads the directory to a git-SHA path and to the stable "latest" path consumers read.
const registerConvention = async (
  conventionId,
  conventionDir,
  gitSha,
  dryRun,
  clan,
) => {
  const { files } = readConvention(conventionId, conventionDir);
  const prefix = conventionPrefix(clan, conventionId);
  core.info(`[convention] files (${files.length}): ${files.join(', ')}`);

  if (dryRun) {
    core.info(
      `[dry-run] Would upload convention to gs://extenda-agent-artifacts/${prefix}/`,
    );
    return;
  }

  await uploadDir(conventionDir, `${prefix}/${gitSha}`);
  const dest = await uploadDir(conventionDir, prefix);
  core.info(`Convention uploaded: ${dest}${CONVENTION_FILE}`);
};

// conventions/<clan>/index.json lists every convention the clan currently has in its repo.
const uploadConventionIndex = async (clan, conventions, dryRun) => {
  const gcsPath = `conventions/${clan}/index.json`;
  const index = {
    clan,
    conventions: conventions.map(({ id, name, description }) => ({
      id,
      name,
      description,
      path: `${conventionPrefix(clan, id)}/${CONVENTION_FILE}`,
    })),
  };
  core.info(
    `[convention] index: ${index.conventions.map((c) => c.id).join(', ') || '(empty)'}`,
  );

  if (dryRun) {
    core.info(
      `[dry-run] Would upload convention index to gs://extenda-agent-artifacts/${gcsPath}`,
    );
    return;
  }

  const tmpPath = path.join(tmpdir(), `conventions-index-${process.pid}.json`);
  writeFileSync(tmpPath, `${JSON.stringify(index, null, 2)}\n`);
  try {
    await upload(tmpPath, gcsPath);
  } finally {
    unlinkSync(tmpPath);
  }
};

export { readConvention, registerConvention, uploadConventionIndex };
