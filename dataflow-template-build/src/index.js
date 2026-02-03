import core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud';
import { run } from '../../utils';
import dataflowBuild from './dataflow-build';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const image = core.getInput('image', { required: true });
  const metadataPath = core.getInput('metadata-path') || '';
  const sdkLanguage = core.getInput('sdk-language') || 'JAVA';
  const templatePath = core.getInput('template-path', { required: true });
  const jarPath = core.getInput('jar') || '';
  const envVars = core.getInput('env') || '';

  await setupGcloud(serviceAccountKey);
  await dataflowBuild(
    templatePath,
    image,
    sdkLanguage,
    metadataPath,
    jarPath,
    envVars,
  );
};

if (require.main === module) {
  run(action);
}

module.exports = action;
