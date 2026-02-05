import execGcloud from '../utils/gcloud-output.js';

const checkIamSystem = async (systemName) => {
  const bucketPointer = `gs://authz-bundles/systems/${systemName}.tar.gz`;
  const result = await execGcloud(['ls', bucketPointer], 'gsutil', true, true)
    .then(() => true)
    .catch(() => false);
  return result;
};

export default checkIamSystem;
