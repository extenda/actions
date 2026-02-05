import fs from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import { exec } from '@actions/exec';

import { execGcloud } from '../../setup-gcloud/src/index.js';
import copyPolicies from './copy-policies.js';

const createTestBundle = async (bundleName, bucketName) => {
  const testBundlePath = 'test-bundle';
  const bucketPath = `gs://${path.join(bucketName, bundleName)}`;
  const outputPath = path.join(testBundlePath, 'bundle.tar.gz');
  core.info(`Download ${bucketPath}`);
  await execGcloud(['storage', 'cp', bucketPath, outputPath]);

  await exec('tar', ['-xf', outputPath, '-C', testBundlePath]);
  fs.rmSync(outputPath);

  // Copy policies
  copyPolicies(testBundlePath);
  return testBundlePath;
};

export default createTestBundle;
