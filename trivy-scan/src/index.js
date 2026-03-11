import * as core from '@actions/core';

import { withGcloud } from '../../setup-gcloud/src/index.js';
import notifySlack from '../../slack-notify/src/slack-notify.js';
import authenticateDocker from './docker-auth.js';
import setupTrivy from './setup-trivy.js';
import { writeTrivyJobSummary } from './trivy-report.js';
import trivyScan from './trivy-scan.js';
import uploadSbom from './upload-sbom.js';

const DEFAULT_ATTESTATION_KEY_URI =
  'gcpkms://projects/platform-prod-2481/locations/europe-west1/keyRings/global-keyring-binary/cryptoKeys/quality-assurance-attestor-key/cryptoKeyVersions/1';

/**
 * Scan an image with Trivy and handle the results according to the specified options. This includes uploading
 * SBOM artifacts, sending Slack notifications, and failing the action if vulnerabilities are found.
 *
 * This method can be used from other actions that want to leverage the Trivy scanning functionality without
 * running a separate step in the CI/CD pipeline.
 *
 * @param serviceAccountKey - The Google Cloud service account key with permissions to upload to Artifact Registry and send Slack notifications
 * @param image - The image to scan, either a semantic image or a sha256 digest
 * @param version - The Trivy version to use
 * @param severity - The severity levels to report on, e.g. "CRITICAL,HIGH"
 * @param ignoreUnfixed - Whether to ignore unfixed vulnerabilities
 * @param timeout - The maximum time spent on each trivy invocation, e.g. `5m0s`
 * @param failOnVulnerabilities - Whether to fail the action if any vulnerabilities are found
 * @param notifySlackOnVulnerabilities - Whether to send a Slack notification if vulnerabilities are found
 * @param uploadSbomArtifacts - Whether to upload SBOM artifacts to Artifact Registry
 * @param attestationKeyUri - The KMS key URI to use for signing the SBOM attestations. If omitted, the default binary authz key is used. Pass `null` to upload SBOMs without attestation.
 * @return {Promise<{success: boolean, image: string, summary: {message: string, critical: int, high: int}, sbom: {spdx: string, cdx: string}, report: {json: string, text: string}}>}
 */
const trivy = async (
  serviceAccountKey,
  image,
  { version, severity, ignoreUnfixed, timeout } = {},
  failOnVulnerabilities = false,
  notifySlackOnVulnerabilities = false,
  uploadSbomArtifacts = false,
  attestationKeyUri = DEFAULT_ATTESTATION_KEY_URI,
) =>
  withGcloud(serviceAccountKey, async () => {
    await authenticateDocker(image);

    const scanResult = await trivyScan(image, {
      version,
      severity,
      ignoreUnfixed,
      timeout,
    });

    const summaryUrl = await writeTrivyJobSummary(scanResult);
    if (summaryUrl) {
      core.notice(`Trivy summary is available on the run page: ${summaryUrl}`);
    }

    if (uploadSbomArtifacts) {
      await uploadSbom(
        image,
        scanResult.sbom,
        typeof attestationKeyUri == 'string' ? attestationKeyUri : undefined,
      );
    }

    if (!scanResult.success) {
      if (notifySlackOnVulnerabilities) {
        core.info('Sending slack notification...');
        await notifySlack(
          serviceAccountKey,
          scanResult.summary.message,
          '',
          scanResult.report.text,
        );
      }

      const vulnerableMessage =
        'Vulnerabilities found in image scan. Please check the report for details.';
      if (failOnVulnerabilities) {
        core.setFailed(vulnerableMessage);
      } else {
        core.warning(vulnerableMessage);
      }
    }

    return scanResult;
  });

const action = async () => {
  const image = core.getInput('image', { required: true });
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const version = core.getInput('trivy-version');
  const severity = core.getInput('severity');
  const ignoreUnfixed = core.getBooleanInput('ignore-unfixed');
  const timeout = core.getInput('timeout');
  const failOnVulnerabilities = core.getBooleanInput('fail-on-vulnerabilities');
  const notifySlackOnVulnerabilities = core.getBooleanInput(
    'notify-slack-on-vulnerabilities',
  );
  const uploadSbomArtifacts = core.getBooleanInput('upload-sbom');
  const attestationKeyUri = core.getInput('sbom-attestation-key-uri');
  const resolvedAttestationKeyUri =
    attestationKeyUri === 'none' ? null : attestationKeyUri || undefined;

  await trivy(
    serviceAccountKey,
    image,
    { version, severity, ignoreUnfixed, timeout },
    failOnVulnerabilities,
    notifySlackOnVulnerabilities,
    uploadSbomArtifacts,
    resolvedAttestationKeyUri,
  );
};

export { setupTrivy, trivy };

/** Default export used by action entrypoint. */
export default action;
