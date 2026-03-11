import fs from 'node:fs';

import { exec } from '@actions/exec';
import { afterAll, afterEach, beforeEach, expect, test, vi } from 'vitest';

import { resolveImageDigests } from '../../utils/src/index.js';
import setupTrivy from '../src/setup-trivy.js';
import { generateSummary, generateTextReport } from '../src/trivy-report.js';
import trivyScan from '../src/trivy-scan.js';

vi.mock('../../utils/src/index.js');
vi.mock('@actions/exec');
vi.mock('../src/trivy-report.js');
vi.mock('../src/setup-trivy.js');
vi.mock('../src/resolve-digest.js');
vi.mock('../../utils/src/index.js');

beforeEach(() => {
  setupTrivy.mockResolvedValueOnce('/tmp/trivy');
  exec.mockResolvedValue(0);
  generateTextReport.mockReturnValueOnce(true);
  generateSummary.mockReturnValueOnce({
    message: 'Summary',
    high: 0,
    critical: 0,
  });
  resolveImageDigests.mockResolvedValue({
    indexSha: 'ubuntu@sha256:index',
    manifestSha: 'ubuntu@sha256:manifest',
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

afterAll(() => {
  fs.rmSync('.trivy', { recursive: true, force: true });
});

test('It can scan with Trivy defaults', async () => {
  const scanResult = await trivyScan('ubuntu');
  expect(scanResult).toEqual({
    success: true,
    image: 'ubuntu@sha256:manifest',
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

  expect(exec).toHaveBeenNthCalledWith(1, '/tmp/trivy', [
    'image',
    '--format',
    'spdx-json',
    '--license-full',
    '--db-repository',
    'ghcr.io/aquasecurity/trivy-db:2,public.ecr.aws/aquasecurity/trivy-db:2',
    '--timeout',
    '5m0s',
    '--output',
    '.trivy/sbom.spdx.json',
    'ubuntu@sha256:manifest',
  ]);
  expect(exec).toHaveBeenNthCalledWith(2, '/tmp/trivy', [
    'image',
    '--format',
    'cyclonedx',
    '--db-repository',
    'ghcr.io/aquasecurity/trivy-db:2,public.ecr.aws/aquasecurity/trivy-db:2',
    '--timeout',
    '5m0s',
    '--output',
    '.trivy/sbom.cdx.json',
    'ubuntu@sha256:manifest',
  ]);
  expect(exec).toHaveBeenNthCalledWith(3, '/tmp/trivy', [
    'sbom',
    '--format',
    'json',
    '--severity',
    'CRITICAL,HIGH',
    '--exit-code',
    '0',
    '--db-repository',
    'ghcr.io/aquasecurity/trivy-db:2,public.ecr.aws/aquasecurity/trivy-db:2',
    '--timeout',
    '5m0s',
    '--output',
    '.trivy/report.json',
    '--ignore-unfixed',
    '.trivy/sbom.cdx.json',
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
    '--format',
    'json',
    '--severity',
    'CRITICAL,HIGH,MEDIUM',
    '--exit-code',
    '0',
    '--db-repository',
    'ghcr.io/aquasecurity/trivy-db:2,public.ecr.aws/aquasecurity/trivy-db:2',
    '--timeout',
    '5m0s',
    '--output',
    '.trivy/report.json',
    '.trivy/sbom.cdx.json',
  ]);
});

test('It fails if SBOM generation fails', async () => {
  exec.mockReset();
  exec.mockResolvedValue(0).mockRejectedValue(1);
  await expect(() => trivyScan('ubuntu')).rejects.toThrow();
});
