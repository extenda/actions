import * as core from '@actions/core';

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

  const args = ['container', 'images', 'describe', container, '--format=json'];

  const output = await execGcloud(args);
  const data = JSON.parse(output);

  let digest;

  // Check if it's an OCI Image Index (Provenance/Multi-arch)
  if (data.manifests && Array.isArray(data.manifests)) {
    // Cloud Run uses (linux/amd64)
    const target = data.manifests.find(
      (m) =>
        m.platform &&
        m.platform.architecture === 'amd64' &&
        m.platform.os === 'linux',
    );

    if (target) {
      digest = target.digest;
      core.debug(`Resolved OCI Index to linux/amd64 digest: ${digest}`);
    }
  }

  if (!digest) {
    // Standard Image (Legacy or Provenance disabled)
    digest = data.image_summary.digest;
    core.debug(`Detected standard manifest. Using digest: ${digest}`);
  }

  if (!digest) {
    throw new Error(`Failed to retrieve digest for image ${container}`);
  }

  return `${imageName}@${digest}`;
};

export { createAttestation, getArtifactUrl };
