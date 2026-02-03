import core from '@actions/core';
import fs from 'fs';
import path from 'path';

import { setupGcloud } from '../../setup-gcloud';
import { run } from '../../utils';
import getBundleName from './bundle-name';
import createTestBundle from './create-test-bundle';
import opaTest from './opa-test';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const bucketName = core.getInput('gcs-bucket');

  if (!fs.existsSync(path.join('policies', 'policy'))) {
    throw new Error(
      'No policies found. Exit. Expected folder: policies/policy',
    );
  }

  // The "inherit" value indicates that we should reuse an existing gcloud authentication.
  // We support this to be able to forward styra-das-test runs to this action.
  if (serviceAccountKey !== 'inherit') {
    await setupGcloud(serviceAccountKey);
  }

  const bundleName = getBundleName();
  const testBundle = await createTestBundle(bundleName, bucketName);

  return opaTest(testBundle);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
