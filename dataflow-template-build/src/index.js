import { fileURLToPath } from 'node:url';
import * as core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { run } from '../../utils/src/index.js';
import dataflowBuild from './dataflow-build.js';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(action);
}

export default action;
