import fs from 'node:fs';

import { exec } from '@actions/exec';

import { resolveImageDigests } from '../../utils/src/index.js';
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
 * @param image - The image to scan, ideally identified by a digest to ensure mutability
 * @param version - The Trivy version to use
 * @param severity - The severity levels to report on, e.g. "CRITICAL,HIGH"
 * @param ignoreUnfixed - Whether to ignore unfixed vulnerabilities
 * @param timeout - The maximum time spent on each trivy invocation, e.g. `5m0s`
 * @return {Promise<{success: boolean, image: string, summary: {message: string, critical: int, high: int}, sbom: {spdx: string, cdx: string}, report: {json: string, text: string}}>} a summary object containing the scan results and paths to the generated SBOM and report files.
 */
export default async function trivyScan(
  image,
  {
    version = 'latest',
    severity = 'CRITICAL,HIGH',
    ignoreUnfixed = true,
    timeout = '5m0s',
  } = {},
) {
  const trivy = await setupTrivy(version);

  if (!fs.existsSync('.trivy')) {
    fs.mkdirSync('.trivy', { recursive: true });
  }

  const { manifestSha } = await resolveImageDigests(image);

  const repos = [
    'ghcr.io/aquasecurity/trivy-db:2',
    'public.ecr.aws/aquasecurity/trivy-db:2',
  ].join(',');

  await exec(trivy, [
    'image',
    '--format',
    'spdx-json',
    '--license-full',
    '--db-repository',
    repos,
    '--timeout',
    timeout,
    '--output',
    outputs.sbom.spdx,
    manifestSha,
  ]);

  await exec(trivy, [
    'image',
    '--format',
    'cyclonedx',
    '--db-repository',
    repos,
    '--timeout',
    timeout,
    '--output',
    outputs.sbom.cdx,
    manifestSha,
  ]);

  const scanOpts = [
    '--format',
    'json',
    '--severity',
    severity,
    '--exit-code',
    '0',
    '--db-repository',
    repos,
    '--timeout',
    timeout,
    '--output',
    outputs.report.json,
  ];
  if (ignoreUnfixed) {
    scanOpts.push('--ignore-unfixed');
  }

  await exec(trivy, ['sbom', ...scanOpts, '.trivy/sbom.cdx.json']);

  generateTextReport(manifestSha, outputs);
  const summary = generateSummary(manifestSha, outputs);

  return {
    success: summary.critical === 0,
    summary,
    image: manifestSha,
    ...outputs,
  };
}
