import { execGcloud } from '../../setup-gcloud/src.js';

const uploadToBucket = async (file, bucket) => {
  const gcloudArgs = ['storage', 'cp', file, bucket];

  return await execGcloud(gcloudArgs);
};

export default uploadToBucket;
