import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

const GCS_BUCKET = 'extenda-agent-artifacts';

const upload = async (localPath, gcsPath) => {
  const dest = `gs://${GCS_BUCKET}/${gcsPath}`;
  await execGcloud(['storage', 'cp', localPath, dest], 'gcloud', true);
  return dest;
};

/**
 * Upload many files in one gcloud call, which transfers them in parallel.
 * `gcloud storage cp` with several sources flattens them into the destination,
 * so the files are staged in a temp dir that mirrors their relative paths and
 * `gcloud storage rsync -r` copies that tree to the prefix. Object names are
 * identical to uploading each file with `upload(localPath, `${prefix}/${rel}`)`.
 * @param {Array<{localPath: string, relPath: string}>} files files and their posix path below the prefix
 * @param {string} gcsPrefix destination prefix in the bucket, without trailing slash
 * @returns {Promise<string>} the destination gs:// URL
 */
const uploadMany = async (files, gcsPrefix) => {
  const dest = `gs://${GCS_BUCKET}/${gcsPrefix}`;
  const stage = mkdtempSync(path.join(tmpdir(), 'gcs-stage-'));
  try {
    for (const { localPath, relPath } of files) {
      const target = path.join(stage, ...relPath.split('/'));
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(localPath, target);
    }
    await execGcloud(['storage', 'rsync', '-r', stage, dest], 'gcloud', true);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  return dest;
};

export { upload, uploadMany };
