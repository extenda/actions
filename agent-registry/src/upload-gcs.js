import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

const GCS_BUCKET = 'extenda-agent-artifacts';

const upload = async (localPath, gcsPath) => {
  const dest = `gs://${GCS_BUCKET}/${gcsPath}`;
  await execGcloud(['storage', 'cp', localPath, dest], 'gcloud', true);
  return dest;
};

// Mirrors a local directory to gs://<bucket>/<gcsPrefix>/, keeping relative paths.
const uploadDir = async (localDir, gcsPrefix) => {
  const dest = `gs://${GCS_BUCKET}/${gcsPrefix}/`;
  await execGcloud(['storage', 'rsync', localDir, dest, '--recursive'], 'gcloud', true);
  return dest;
};

export { upload, uploadDir };
