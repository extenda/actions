import { exec } from '@actions/exec';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import resolveDigest from '../src/resolve-digest.js';
import setupTrivy from '../src/setup-trivy.js';
import { generateSummary, generateTextReport } from '../src/text-report.js';
import trivyScan from '../src/trivy-scan.js';

vi.mock('../../utils/src/index.js');
vi.mock('@actions/exec');
vi.mock('../src/text-report.js');
vi.mock('../src/setup-trivy.js');
vi.mock('../src/resolve-digest.js');

afterEach(() => {
  vi.resetAllMocks();
});

beforeEach(() => {
  setupTrivy.mockResolvedValueOnce('/tmp/trivy');
  exec.mockResolvedValue(0);
  generateTextReport.mockReturnValueOnce(true);
  generateSummary.mockReturnValueOnce({
    message: 'Summary',
    high: 0,
    critical: 0,
  });
  resolveDigest.mockResolvedValue({
    indexSha: 'ubuntu@sha256:index',
    manifestSha: 'ubuntu@sha256:manifest',
  });
});

test('It can scan with Trivy defaults', async () => {
  const scanResult = await trivyScan('ubuntu');
  expect(scanResult).toEqual({
    success: true,
    image: 'ubuntu',
    summary: {
      message: 'Summary',
      high: 0,
      critical: 0,
    },
    sbom: {
      spdx: '.trivy/sbom.spdx.json',
      cdx: '.trivy/sbom.cdx.json',
    },
    report: {
      json: '.trivy/report.json',
      text: '.trivy/report.txt',
    },
  });

  expect(exec).toHaveBeenCalledWith('/tmp/trivy', [
    '--format spdx-json',
    '--license-full',
    '--pkg-relationships',
    '--output .trivy/sbom.spdx.json',
    'ubuntu@sha256:manifest',
  ]);
  expect(exec).toHaveBeenCalledWith('/tmp/trivy', [
    '--format cyclonedx',
    '--output .trivy/sbom.cdx.json',
    'ubuntu@sha256:manifest',
  ]);
  expect(exec).toHaveBeenCalledWith('/tmp/trivy', [
    'sbom',
    '.trivy/sbom.cdx.json',
    '--severity CRITICAL,HIGH',
    '--exit-code 0',
    '--output .trivy/report.json',
    '--ignore-unfixed',
  ]);

  expect(generateTextReport).toHaveBeenCalledWith(
    'ubuntu@sha256:manifest',
    expect.objectContaining({
      report: {
        json: '.trivy/report.json',
        text: '.trivy/report.txt',
      },
    }),
  );
  expect(generateSummary).toHaveBeenCalledWith(
    'ubuntu@sha256:manifest',
    expect.objectContaining({
      report: {
        json: '.trivy/report.json',
        text: '.trivy/report.txt',
      },
    }),
  );
});

test('It can scan with custom options', async () => {
  const scanResult = await trivyScan('ubuntu', {
    version: '0.30.0',
    severity: 'CRITICAL,HIGH,MEDIUM',
    ignoreUnfixed: false,
  });
  expect(scanResult).toMatchObject({
    success: true,
  });

  expect(setupTrivy).toHaveBeenCalledWith('0.30.0');

  // Custom options applies to the final scan command, but not SBOM generation
  expect(exec).toHaveBeenCalledWith('/tmp/trivy', [
    'sbom',
    '.trivy/sbom.cdx.json',
    '--severity CRITICAL,HIGH,MEDIUM',
    '--exit-code 0',
    '--output .trivy/report.json',
  ]);
});

test('It fails if SBOM generation fails', async () => {
  exec.mockReset();
  exec.mockResolvedValue(0).mockRejectedValue(1);
  await expect(() => trivyScan('ubuntu')).rejects.toThrow();
});
