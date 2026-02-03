import setupGcloud from '../../setup-gcloud/src/index.js';
const { execGcloud } = setupGcloud;
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
  return execGcloud(args);
};
const getArtifactUrl = async (tag, imagePath) => {
  const imageName = imagePath.split(':')[0] || imagePath;
  const container = `${imageName}:${tag}`;
  const args = [
    'container',
    'images',
    'describe',
    container,
    '--format=get(image_summary.digest)',
  ];
  const digest = await execGcloud(args);
  return `${imageName}@${digest}`;
};
export { createAttestation };
export { getArtifactUrl };
export default {
  createAttestation,
  getArtifactUrl,
};
