import * as core from '@actions/core';
import fs from 'fs';
import path from 'path';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import getBundleName from './bundle-name.js';
import createTestBundle from './create-test-bundle.js';
import opaTest from './opa-test.js';

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

// Entry point check removed for ESM compatibility

export default action;
