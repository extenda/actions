import { execGcloud } from '../../setup-gcloud';

const uploadToBucket = async (file, bucket) => {
  const gcloudArgs = ['storage', 'cp', file, bucket];

  return await execGcloud(gcloudArgs);
};

export default uploadToBucket;
