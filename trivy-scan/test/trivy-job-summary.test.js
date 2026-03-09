import * as core from '@actions/core';
import mockFs from 'mock-fs';
import { afterEach, expect, test, vi } from 'vitest';

import trivyJobSummary from '../src/trivy-job-summary.js';

vi.mock('@actions/core');

const JSON_REPORT = {
  Results: [
    {
      Vulnerabilities: [
        {
          Severity: 'HIGH',
          VulnerabilityID: 'CVE-2025-9900',
          PkgName: 'libtiff-dev',
          Title: 'libtiff: Libtiff Write-What-Where',
        },
        {
          Severity: 'CRITICAL',
          VulnerabilityID: 'CVE-2025-9999',
          PkgName: 'openssl',
          Title: 'openssl: Buffer overflow',
        },
        {
          Severity: 'LOW',
          VulnerabilityID: 'CVE-2025-7777',
          PkgName: 'zlib',
          Title: 'zlib: Some low issue',
        },
        {
          Severity: 'LOW',
          VulnerabilityID: 'CVE-2025-7777',
          PkgName: 'rand',
          Title: 'rand: duplicate should not be listed',
        },
      ],
    },
  ],
};

afterEach(() => {
  mockFs.restore();
  vi.resetAllMocks();
});

const createSummaryMock = () => {
  const summary = {
    addHeading: vi.fn(),
    addRaw: vi.fn(),
    addEOL: vi.fn(),
    addTable: vi.fn(),
    write: vi.fn(),
  };

  summary.addHeading.mockReturnValue(summary);
  summary.addRaw.mockReturnValue(summary);
  summary.addEOL.mockReturnValue(summary);
  summary.addTable.mockReturnValue(summary);
  summary.write.mockResolvedValue(undefined);

  vi.spyOn(core, 'summary', 'get').mockReturnValue(summary);
};

test('It writes trivy results to the GitHub job summary', async () => {
  mockFs({
    '.trivy/report.json': JSON.stringify(JSON_REPORT),
  });
  createSummaryMock();

  const success = await trivyJobSummary({
    image: 'ubuntu@sha256:manifest',
    report: { json: '.trivy/report.json' },
  });

  expect(success).toEqual(true);
  expect(core.summary.addHeading).toHaveBeenCalledWith('Trivy Scan Report');
  expect(core.summary.addRaw).toHaveBeenCalledWith(
    'Total vulnerabilities found on ubuntu@sha256:manifest: 3 (UNKNOWN: 0, LOW: 1, MEDIUM: 0, HIGH: 1, CRITICAL: 1)',
  );

  const tableRows = core.summary.addTable.mock.calls[0][0];
  expect(tableRows[0]).toEqual([
    { data: 'Severity', header: true },
    { data: 'Vulnerability', header: true },
    { data: 'Package', header: true },
    { data: 'Title', header: true },
  ]);
  expect(tableRows[1][0]).toEqual('CRITICAL');
  expect(tableRows[2][0]).toEqual('HIGH');
  expect(tableRows[3][0]).toEqual('LOW');
  expect(core.summary.write).toHaveBeenCalledTimes(1);
});

test('It skips summary when the trivy json report is missing', async () => {
  createSummaryMock();

  const success = await trivyJobSummary({
    image: 'ubuntu@sha256:manifest',
    report: { json: '.trivy/report.json' },
  });

  expect(success).toEqual(false);
  expect(core.info).toHaveBeenCalledWith(
    'Trivy JSON report not found, skipping job summary.',
  );
  expect(core.summary.write).not.toHaveBeenCalled();
});
