import * as core from '@actions/core';
import { getExecOutput } from '@actions/exec';

import { execGcloud } from '../../../setup-gcloud/src/index.js';

const getImageWithSha256 = async (semanticImage) => {
  await execGcloud(['auth', 'configure-docker', '--quiet']);

  const { stdout: output } = await getExecOutput('docker', [
    'manifest',
    'inspect',
    semanticImage,
  ]);

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
      core.info(`Resolved OCI Index to linux/amd64 digest: ${digest}`);
    }
  }

  if (!digest) {
    // Standard Image (Legacy or Provenance disabled)
    const args = [
      'container',
      'images',
      'describe',
      semanticImage,
      '--format=get(image_summary.digest)',
    ];

    digest = await execGcloud(args);
    core.info(`Detected standard manifest. Using digest: ${digest}`);
  }

  if (!digest) {
    throw new Error(`Failed to retrieve digest for image ${semanticImage}`);
  }

  return `${semanticImage.split(':')[0]}@${digest}`;
};

export default getImageWithSha256;
