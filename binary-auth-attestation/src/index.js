import * as core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { run } from '../../utils/src/index.js';
import { createAttestation, getArtifactUrl } from './create-sign-attestion.js';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const attestor = core.getInput('attestor') || 'quality-assurance-attestor';
  const attestorProject =
    core.getInput('attestor-project') || 'platform-prod-2481';
  const keyversionProject =
    core.getInput('keyversion-project') || 'platform-prod-2481';
  const keyversionLocation =
    core.getInput('keyversion-location') || 'europe-west1';
  const keyversionKeyring =
    core.getInput('keyversion-keyring') || 'global-keyring-binary';
  const keyversionKey =
    core.getInput('keyversion-key') || 'quality-assurance-attestor-key';
  const keyversion = core.getInput('keyversion') || '1';
  const imagePath = core.getInput('image-path', { required: true });

  const tag = imagePath.split(':')[1] || process.env.GITHUB_SHA;
  const artifactUrl = await getArtifactUrl(tag, imagePath);

  await setupGcloud(serviceAccountKey);
  await createAttestation(
    artifactUrl,
    attestor,
    attestorProject,
    keyversionProject,
    keyversionLocation,
    keyversionKeyring,
    keyversionKey,
    keyversion,
  );
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
