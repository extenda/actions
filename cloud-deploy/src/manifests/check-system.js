import execGcloud from '../utils/gcloud-output.js';

const checkIamSystem = async (systemName) => {
  const bucketPointer = `gs://authz-bundles/systems/${systemName}.tar.gz`;
  const result = await execGcloud(
    ['storage', 'ls', bucketPointer],
    'gcloud',
    true,
    true,
  )
    .then(() => true)
    .catch(() => false);
  return result;
};

export default checkIamSystem;
