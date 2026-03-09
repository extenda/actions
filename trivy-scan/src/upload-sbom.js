import * as core from '@actions/core';

import { execGcloud, withGcloud } from '../../setup-gcloud/src/index.js';
import resolveDigest from './resolve-digest.js';

const upload = async (uri, sbom) => {
  core.info(`Uploading SBOM [${sbom}] to URI [${uri}]...`);
  return execGcloud([
    'artifacts',
    'sbom',
    'load',
    `--source=${sbom}`,
    `--uri=${uri}`,
  ])
    .then(() => {
      core.info(`Uploaded SBOM [${sbom}] to URI [${uri}]`);
    })
    .catch((error) => {
      core.error(
        `Failed to upload SBOM [${sbom}] to [${uri}]: ${error.message}`,
      );
      // Rethrow the error to ensure the action fails if the upload fails. This ensures CRA compliance.
      throw error;
    });
};

const uploadForDigest = (digests, sbom) => {
  const uploads = [];

  // Always upload the specific platform manifest (the artifact)
  uploads.push(upload(digests.manifestSha, sbom));

  if (digests.isMultiArch) {
    // For multi-arch images, also link the SBOM to the index list (the product).
    core.info(`Multi-arch detected: linking [${sbom}] to Index SHA as well.`);
    uploads.push(upload(digests.indexSha, sbom));
  }
  return uploads;
};

/**
 * Upload SBOM artifacts to Google Artifact Registry.
 * @param image the image that was scanned
 * @param spdx the SPDX SBOM file path
 * @param cdx the CycloneDX SBOM file path
 * @param serviceAccountKey the Google Cloud service account key with permissions to upload to Artifact Registry
 * @return {Promise<void>} a promise that resolves when the uploads are complete
 */
export default async function uploadSbom(
  image,
  { spdx, cdx },
  serviceAccountKey,
) {
  return withGcloud(serviceAccountKey, async () => {
    core.startGroup(`Uploading SBOMs for ${image}`);
    const digests = await resolveDigest(image);
    await Promise.all([
      // Upload SPDX for legal compliance use cases
      ...uploadForDigest(digests, spdx),
      // Upload CycloneDX for vulnerability management use cases
      ...uploadForDigest(digests, cdx),
    ]);
    core.endGroup();
  });
}
