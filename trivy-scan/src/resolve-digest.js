import { execGcloud } from '../../setup-gcloud/src/index.js';
import { resolveImageDigests } from '../../utils/src/index.js';

/**
 * Resolve the image digest(s) for a given image reference.
 * @param {string} image - An image reference (tag or digest).
 * @returns {Promise<{indexSha: string, manifestSha: string, isMultiArch: boolean}>}
 */
export default async function resolveDigest(image) {
  // Ensure we are authenticated for registry-level metadata inspection
  await execGcloud(['auth', 'configure-docker', '--quiet']);
  return resolveImageDigests(image);
}
