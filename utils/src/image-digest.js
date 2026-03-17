import * as core from '@actions/core';
import { getExecOutput } from '@actions/exec';

/**
 * Resolve the image digest(s) for a given image reference.
 * @param {string} image - An image reference (tag or digest).
 * @returns {Promise<{indexSha: string, manifestSha: string, isMultiArch: boolean}>}
 */
export async function resolveImageDigests(image) {
  // 1. Get the Raw Manifest/Index to check for multi-arch structure
  const { stdout: rawOutput } = await getExecOutput(
    'docker',
    ['buildx', 'imagetools', 'inspect', image, '--raw'],
    { silent: true },
  );
  const data = JSON.parse(rawOutput);

  // 2. Resolve the Top-Level Digest (The "Parent" or "Index")
  const { stdout: indexData } = await getExecOutput(
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      image,
      '--format',
      '{{json .Manifest.Digest}}',
    ],
    { silent: true },
  );
  const indexSha = JSON.parse(indexData);

  let manifestSha = indexSha;
  let isMultiArch = false;

  // 3. Determine if this is a Multi-Arch Index (OCI Index or Docker Manifest List)
  // Check for the presence of the 'manifests' array which indicates an Index
  if (data.manifests && Array.isArray(data.manifests)) {
    isMultiArch = true;
    core.info(`Detected Multi-Arch image for ${image}`);

    const target = data.manifests.find(
      (m) => m.platform?.architecture === 'amd64' && m.platform?.os === 'linux',
    );

    if (target) {
      manifestSha = target.digest;
      core.info(`Resolved linux/amd64 platform digest: ${manifestSha}`);
    } else {
      core.warning(
        `Multi-arch image found but no linux/amd64 platform detected. Falling back to Index SHA.`,
      );
    }
  } else {
    core.info(`Detected single-arch image for ${image}`);
  }

  const baseName = image.split(/[:@]/)[0];

  return {
    indexSha: `${baseName}@${indexSha}`,
    manifestSha: `${baseName}@${manifestSha}`,
    isMultiArch,
  };
}

/**
 * Get the artifact-level SHA256 digest for a given image reference. This is the digest used by
 * Cloud Run and GKE to start the linux/amd64 container.
 *
 * @param image - An image reference (tag or digest).
 * @return {Promise<string>}
 */
const getImageDigest = async (image) => {
  const { manifestSha } = await resolveImageDigests(image);
  return manifestSha;
};

export default getImageDigest;
