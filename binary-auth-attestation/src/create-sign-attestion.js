import getImageWithSha256 from '../../cloud-deploy/src/manifests/image-sha256.js';
import { execGcloud } from '../../setup-gcloud/src/index.js';

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
  return getImageWithSha256(container);
};

export { createAttestation, getArtifactUrl };
