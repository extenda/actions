const exec = require('@actions/exec');

// Binauthz attestations gcloud cmd
const createAttestation = async (
  artifactUrl,
  attestor,
  attestorProject,
  keyversionProject,
  keyversionLocation,
  keyversionKeyring,
  keyversionKey,
  keyversion,
) => {
  const args = [
    '--quiet',
    'beta',
    'container',
    'binauthz',
    'attestations',
    'sign-and-create',
    `--artifact-url=${artifactUrl}`,
    `--attestor=${attestor}`,
    `--attestor-project=${attestorProject}`,
    `--keyversion-project=${keyversionProject}`,
    `--keyversion-location=${keyversionLocation}`,
    `--keyversion-keyring=${keyversionKeyring}`,
    `--keyversion-key=${keyversionKey}`,
    `--keyversion=${keyversion}`,
  ];
  return exec.exec('gcloud', args);
};

const getArtifactUrl = async (sha, imagePath) => {
  const container = `${imagePath}:${sha}`;
  const args = [
    'container',
    'images',
    'describe',
    container,
    '--format=\'get(image_summary.digest)\'',
  ];
  const digest = exec.exec('gcloud', args);
  return `${imagePath}@${digest}`;
};

module.exports = {
  createAttestation,
  getArtifactUrl,
};
