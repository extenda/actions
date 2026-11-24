import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { exec } from '@actions/exec';
import * as tc from '@actions/tool-cache';
import { afterAll, afterEach, beforeEach, expect, test, vi } from 'vitest';

import { loadTool } from '../../utils/src/index.js';
import archiveScan, {
  grypeToTrivy,
  mergeReports,
} from '../src/archive-scan.js';
import setupTrivy from '../src/setup-trivy.js';

vi.mock('@actions/exec');
vi.mock('@actions/tool-cache');
vi.mock('../../utils/src/index.js');
vi.mock('../src/setup-trivy.js');

const ARCHIVE = 'test-archive.zip';

// Trimmed from a real Grype report of a Checkout Light bundle.
const grypeJson = {
  matches: [
    {
      vulnerability: {
        id: 'CVE-2026-114938',
        severity: 'High',
        description: 'OpenJDK flaw',
        cvss: [
          {
            source: 'secalert_us@oracle.com',
            version: '3.1',
            vector: 'CVSS:3.1/AV:N',
            metrics: { baseScore: 8.1 },
          },
        ],
        fix: { versions: ['25.0.5.1', '27.0.1.1'] },
      },
      relatedVulnerabilities: [],
      artifact: {
        name: 'openjdk',
        version: '25.0.5',
        locations: [{ path: '/app/jre/bin/java' }],
      },
    },
    {
      vulnerability: {
        id: 'GHSA-xxph-c9ww-hj94',
        severity: 'High',
        cvss: [
          { source: null, version: '3.1', metrics: { baseScore: 5.9 } },
          { source: null, version: '4.0', metrics: { baseScore: 8.2 } },
        ],
        fix: { versions: ['33.7.2'] },
      },
      relatedVulnerabilities: [{ id: 'CVE-2026-102554', cvss: [] }],
      artifact: { name: 'guava', version: '33.6.0-jre', locations: [] },
    },
    {
      vulnerability: { id: 'CVE-2026-114947', severity: 'Low' },
      artifact: { name: 'openjdk', version: '25.0.5' },
    },
  ],
};

const trivyJson = {
  Results: [
    {
      Target: 'app/lib/guava.jar',
      Vulnerabilities: [
        {
          VulnerabilityID: 'CVE-2026-102554',
          PkgName: 'com.google.guava:guava',
          InstalledVersion: '33.6.0-jre',
          Severity: 'HIGH',
          CVSS: { nvd: { V3Score: 5.9 } },
        },
      ],
    },
  ],
};

beforeEach(() => {
  setupTrivy.mockResolvedValue('/tmp/trivy');
  loadTool.mockImplementation(async ({ tool }) => `/tmp/${tool}`);
  tc.extractZip.mockResolvedValue('/tmp/extracted');
  exec.mockImplementation(async (tool) => {
    if (tool === '/tmp/grype') {
      fs.writeFileSync('.trivy/grype.json', JSON.stringify(grypeJson));
    }
    if (tool === '/tmp/trivy') {
      fs.writeFileSync('.trivy/trivy-rootfs.json', JSON.stringify(trivyJson));
    }
    return 0;
  });
  fs.writeFileSync(ARCHIVE, 'zip');
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

afterAll(() => {
  fs.rmSync('.trivy', { recursive: true, force: true });
  fs.rmSync(ARCHIVE, { force: true });
});

test('grypeToTrivy maps matches to Trivy vulnerabilities', () => {
  expect(grypeToTrivy(grypeJson, ['HIGH', 'CRITICAL'])).toEqual([
    {
      VulnerabilityID: 'CVE-2026-114938',
      PkgName: 'openjdk',
      PkgPath: '/app/jre/bin/java',
      InstalledVersion: '25.0.5',
      FixedVersion: '25.0.5.1, 27.0.1.1',
      Severity: 'HIGH',
      Title: 'OpenJDK flaw',
      CVSS: {
        'secalert_us@oracle.com': { V3Score: 8.1, V3Vector: 'CVSS:3.1/AV:N' },
      },
    },
    {
      VulnerabilityID: 'CVE-2026-102554',
      PkgName: 'guava',
      PkgPath: undefined,
      InstalledVersion: '33.6.0-jre',
      FixedVersion: '33.7.2',
      Severity: 'HIGH',
      Title: undefined,
      CVSS: { grype: { V3Score: 5.9, V3Vector: undefined } },
    },
  ]);
});

test('mergeReports adds only findings Trivy did not report', () => {
  const merged = mergeReports(
    trivyJson,
    grypeToTrivy(grypeJson, ['HIGH', 'CRITICAL']),
  );
  expect(merged.Results).toHaveLength(2);
  expect(merged.Results[1].Vulnerabilities.map((v) => v.PkgName)).toEqual([
    'openjdk',
  ]);
});

test('It scans an archive and reports the Java runtime', async () => {
  const result = await archiveScan(ARCHIVE);

  expect(tc.extractZip).toHaveBeenCalledWith(
    path.resolve(ARCHIVE),
    expect.any(String),
  );
  expect(exec).toHaveBeenCalledWith('/tmp/syft', [
    expect.stringMatching(/^dir:/),
    '--quiet',
    '--output',
    'cyclonedx-json=.trivy/sbom.cdx.json',
    '--output',
    'spdx-json=.trivy/sbom.spdx.json',
  ]);
  expect(exec).toHaveBeenCalledWith('/tmp/grype', [
    'sbom:.trivy/sbom.cdx.json',
    '--quiet',
    '--output',
    'json',
    '--file',
    '.trivy/grype.json',
    '--only-fixed',
  ]);
  expect(exec).toHaveBeenCalledWith(
    '/tmp/trivy',
    expect.arrayContaining(['rootfs', '--ignore-unfixed']),
  );

  const report = JSON.parse(fs.readFileSync('.trivy/report.json', 'utf8'));
  const ids = report.Results.flatMap((r) =>
    r.Vulnerabilities.map((v) => v.VulnerabilityID),
  );
  expect(ids).toEqual(['CVE-2026-102554', 'CVE-2026-114938']);

  expect(result).toMatchObject({
    success: true,
    image: ARCHIVE,
    summary: { high: 2, critical: 0, cvssScore: 8.1 },
    sbom: { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
    report: { json: '.trivy/report.json', text: '.trivy/report.txt' },
  });
  expect(fs.readFileSync('.trivy/report.txt', 'utf8')).toContain('openjdk');
});

test('It fails the threshold on the Java runtime score', async () => {
  const result = await archiveScan(ARCHIVE, { scoreThreshold: 8.0 });
  expect(result.success).toBe(false);
});

test('It reports unfixed vulnerabilities when asked', async () => {
  await archiveScan(ARCHIVE, { ignoreUnfixed: false });
  expect(exec).toHaveBeenCalledWith(
    '/tmp/grype',
    expect.not.arrayContaining(['--only-fixed']),
  );
  expect(exec).toHaveBeenCalledWith(
    '/tmp/trivy',
    expect.not.arrayContaining(['--ignore-unfixed']),
  );
});

test('It throws if the archive does not exist', async () => {
  await expect(archiveScan('missing.zip')).rejects.toThrow(
    'Archive not found: missing.zip',
  );
  expect(exec).not.toHaveBeenCalled();
});

test('It throws on non-Linux runners', async () => {
  vi.spyOn(os, 'platform').mockReturnValue('win32');
  await expect(archiveScan(ARCHIVE)).rejects.toThrow(
    'Archive scans are only supported on Linux runners.',
  );
});
