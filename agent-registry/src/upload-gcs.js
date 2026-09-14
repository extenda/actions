import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

const GCS_BUCKET = 'extenda-agent-artifacts';

const upload = async (localPath, gcsPath) => {
  const dest = `gs://${GCS_BUCKET}/${gcsPath}`;
  await execGcloud(['storage', 'cp', localPath, dest]);
  return dest;
};

export { upload };
