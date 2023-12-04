const path = require('path');
const core = require('@actions/core');
const { exec } = require('@actions/exec');
const fs = require('fs');
const { execGcloud } = require('../../setup-gcloud');
const copyPolicies = require('./copy-policies');

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

module.exports = createTestBundle;
