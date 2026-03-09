import * as core from '@actions/core';

import notifySlack from '../../slack-notify/src/slack-notify.js';
import setupTrivy from './setup-trivy.js';
import { writeTrivyJobSummary } from './trivy-report.js';
import trivyScan from './trivy-scan.js';
import uploadSbom from './upload-sbom.js';

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
 * @param failOnVulnerabilities - Whether to fail the action if any vulnerabilities are found
 * @param notifySlackOnVulnerabilities - Whether to send a Slack notification if vulnerabilities are found
 * @param uploadSbomArtifacts - Whether to upload SBOM artifacts to Artifact Registry
 * @return {Promise<{success: boolean, image: string, summary: {message: string, critical: int, high: int}, sbom: {spdx: string, cdx: string}, report: {json: string, text: string}}>}
 */
const trivy = async (
  serviceAccountKey,
  image,
  { version, severity, ignoreUnfixed } = {},
  failOnVulnerabilities = false,
  notifySlackOnVulnerabilities = false,
  uploadSbomArtifacts = false,
) => {
  const scanResult = await trivyScan(image, {
    version,
    severity,
    ignoreUnfixed,
  });

  await writeTrivyJobSummary(scanResult);

  if (uploadSbomArtifacts) {
    await uploadSbom(image, scanResult.sbom, serviceAccountKey);
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

    if (failOnVulnerabilities) {
      core.setFailed(
        'Vulnerabilities found in image scan. Please check the report for details.',
      );
    }
  }

  return scanResult;
};

const action = async () => {
  const image = core.getInput('image', { required: true });
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const version = core.getInput('trivy-version');
  const severity = core.getInput('severity');
  const ignoreUnfixed = core.getBooleanInput('ignore-unfixed');
  const failOnVulnerabilities = core.getBooleanInput('fail-on-vulnerabilities');
  const notifySlackOnVulnerabilities = core.getBooleanInput(
    'notify-slack-on-vulnerabilities',
  );
  const uploadSbomArtifacts = core.getBooleanInput('upload-sbom');
  await trivy(
    serviceAccountKey,
    image,
    { version, severity, ignoreUnfixed },
    failOnVulnerabilities,
    notifySlackOnVulnerabilities,
    uploadSbomArtifacts,
  );
};

export { setupTrivy, trivy, trivyScan, uploadSbom };

/** Default export used by action entrypoint. */
export default action;
