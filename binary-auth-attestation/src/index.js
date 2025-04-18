const core = require('@actions/core');
const {
  createAttestation,
  getArtifactUrl,
} = require('./create-sign-attestion');
const { run } = require('../../utils');
const { setupGcloud } = require('../../setup-gcloud');

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

if (require.main === module) {
  run(action);
}

module.exports = action;
