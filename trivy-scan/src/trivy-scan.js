import { exec } from '@actions/exec';

import resolveDigest from './resolve-digest.js';
import setupTrivy from './setup-trivy.js';
import { generateSummary, generateTextReport } from './trivy-report.js';

const outputs = {
  sbom: {
    spdx: '.trivy/sbom.spdx.json',
    cdx: '.trivy/sbom.cdx.json',
  },
  report: {
    json: '.trivy/report.json',
    text: '.trivy/report.txt',
  },
};

/**
 * Scan an image with Trivy. The result indicates success if no critical vulnerabilities are found, but the summary
 * contains counts of all severities found. The generated SBOM and report files are saved to the .trivy directory.
 *
 * @param image the image to scan, ideally identified by a digest to ensure mutability
 * @param version the Trivy version to use
 * @param severity the severity levels to report on, e.g. "CRITICAL,HIGH"
 * @param ignoreUnfixed whether to ignore unfixed vulnerabilities
 * @return {Promise<{success: boolean, image: string, summary: {message: string, critical: int, high: int}, sbom: {spdx: string, cdx: string}, report: {json: string, text: string}}>} a summary object containing the scan results and paths to the generated SBOM and report files.
 */
export default async function trivyScan(
  image,
  { version = 'latest', severity = 'CRITICAL,HIGH', ignoreUnfixed = true } = {},
) {
  const trivy = await setupTrivy(version);

  const { manifestSha } = await resolveDigest(image);

  await exec(trivy, [
    '--format spdx-json',
    '--license-full',
    '--pkg-relationships',
    `--output ${outputs.sbom.spdx}`,
    manifestSha,
  ]);

  await exec(trivy, [
    '--format cyclonedx',
    `--output ${outputs.sbom.cdx}`,
    manifestSha,
  ]);

  const scanArgs = [
    'sbom',
    '.trivy/sbom.cdx.json',
    `--severity ${severity}`,
    `--exit-code 0`,
    `--output ${outputs.report.json}`,
  ];
  if (ignoreUnfixed) {
    scanArgs.push('--ignore-unfixed');
  }

  await exec(trivy, scanArgs);

  generateTextReport(manifestSha, outputs);
  const summary = generateSummary(manifestSha, outputs);

  return {
    success: summary.critical === 0,
    summary,
    image,
    ...outputs,
  };
}
