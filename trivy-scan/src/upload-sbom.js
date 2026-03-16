import * as core from '@actions/core';
import { exec } from '@actions/exec';

import { execGcloud } from '../../setup-gcloud/src/index.js';
import createKeyFile from '../../utils/src/create-key-file.js';
import { resolveImageDigests } from '../../utils/src/index.js';
import setupCosign from './setup-cosign.js';

const attestSbom = async (
  cosign,
  credentialsPath,
  attestationKeyUri,
  uri,
  sbom,
) => {
  core.info(`Attesting SBOM for [${uri}] using [${attestationKeyUri}]...`);
  return exec(
    cosign,
    [
      'attest',
      '--key',
      attestationKeyUri,
      '--type',
      sbom.includes('spdx') ? 'spdxjson' : 'cyclonedx',
      '--predicate',
      sbom,
      '--yes',
      uri,
    ],
    {
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
      },
    },
  );
};

const upload = async (uri, sbom, sbomBucket) => {
  core.info(`Uploading SBOM [${sbom}] to URI [${uri}]...`);

  const args = [
    'artifacts',
    'sbom',
    'load',
    `--source=${sbom}`,
    `--uri=${uri}`,
  ];

  if (sbomBucket) {
    // Google uses a specific encoding for the 'folder' part of the path
    const folderName = encodeURIComponent(uri).replaceAll('%', '%25');
    args.push(`--destination=gs://${sbomBucket}/${folderName}/sbom/${sbom}`);
  }

  return execGcloud(args)
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

const uploadForDigest = (digests, sbom, sbomBucket, cosignFn) => {
  const uploads = [];

  // Always upload the specific platform manifest (the artifact)
  uploads.push(
    upload(digests.manifestSha, sbom, sbomBucket).then(() =>
      cosignFn(digests.manifestSha, sbom),
    ),
  );

  if (digests.isMultiArch) {
    // For multi-arch images, also link the SBOM to the index list (the product).
    core.info(`Multi-arch detected: linking [${sbom}] to Index SHA as well.`);
    uploads.push(
      upload(digests.indexSha, sbom, sbomBucket).then(() =>
        cosignFn(digests.indexSha, sbom),
      ),
    );
  }
  return uploads;
};

/**
 * Upload SBOM artifacts to Google Artifact Registry.
 * @param image - The image that was scanned
 * @param spdx - The SPDX SBOM file path
 * @param cdx - The CycloneDX SBOM file path
 * @param attestationKeyUri - The KMS key URI to use for signing the SBOM attestations. If not provided, SBOMs will be uploaded without attestation.
 * @param serviceAccountKey - The gcloud service account key
 * @param sbomBucket - The google cloud bucket to upload SBOMs to
 * @return {Promise<void>} a promise that resolves when the uploads are complete
 */
export default async function uploadSbom(
  image,
  { spdx, cdx },
  attestationKeyUri,
  serviceAccountKey,
  sbomBucket = undefined,
) {
  let cosignFn;
  if (attestationKeyUri && serviceAccountKey) {
    const cosign = await setupCosign();
    const credentialsPath = createKeyFile(serviceAccountKey);
    cosignFn = async (uri, sbom) =>
      attestSbom(cosign, credentialsPath, attestationKeyUri, uri, sbom);
  } else {
    cosignFn = async () => {};
  }

  core.startGroup(`Uploading SBOMs for ${image}`);
  const digests = await resolveImageDigests(image);
  await Promise.all([
    // Upload SPDX for legal compliance use cases
    ...uploadForDigest(digests, spdx, sbomBucket, cosignFn),
    // Upload CycloneDX for vulnerability management use cases
    ...uploadForDigest(digests, cdx, sbomBucket, cosignFn),
  ]);
  core.endGroup();
}
