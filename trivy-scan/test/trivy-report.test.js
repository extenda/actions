import fs from 'node:fs';

import * as core from '@actions/core';
import mockFs from 'mock-fs';
import { afterEach, expect, test, vi } from 'vitest';

import {
  generateSummary,
  generateTextReport,
  writeTrivyJobSummary,
} from '../src/trivy-report.js';

vi.mock('@actions/core');

const JSON_REPORT = {
  Results: [
    {
      Vulnerabilities: [
        {
          Severity: 'HIGH',
          VulnerabilityID: 'CVE-2025-9900',
          PkgName: 'libtiff-dev',
          Title:
            'libtiff: Libtiff Write-What-Where (a way too long title that we need to cut',
          InstalledVersion: '4.5.0',
          FixedVersion: '4.5.1',
          CVSS: {
            nvd: {
              V3Score: 7.5,
            },
          },
        },
        {
          Severity: 'CRITICAL',
          VulnerabilityID: 'CVE-2025-9999',
          PkgName: 'openssl',
          Title: 'openssl: Buffer overflow',
          InstalledVersion: '3.0.0',
          FixedVersion: '3.0.5',
          CVSS: {
            nvd: {
              V3Score: 9.8,
            },
          },
        },
        {
          Severity: 'MEDIUM',
          VulnerabilityID: 'CVE-2025-8888',
          PkgName: 'curl',
          Title: 'curl: Some medium issue',
          InstalledVersion: '7.68.0',
          FixedVersion: '7.68.1',
          CVSS: {
            ghsa: {
              V3Score: 5.3,
            },
          },
        },
        {
          Severity: 'LOW',
          VulnerabilityID: 'CVE-2025-7777',
          PkgName: 'zlib',
          Title: 'zlib: Some low issue',
          InstalledVersion: '1.2.11',
          FixedVersion: '1.2.12',
          CVSS: {
            redhat: {
              V3Score: 3.5,
            },
          },
        },
        {
          Severity: 'LOW',
          VulnerabilityID: 'CVE-2025-7777',
          PkgName: 'rand',
          Title: 'rand: CVE duplicate issue',
          InstalledVersion: '0.8.0',
          FixedVersion: '0.8.1',
          CVSS: {
            nvd: {
              V3Score: 3.5,
            },
          },
        },
        {
          Severity: 'UNKNOWN',
          VulnerabilityID: 'CVE-2025-6666',
          PkgName: 'foo',
          Title: 'foo: Unknown issue',
          InstalledVersion: '1.0.0',
          FixedVersion: '1.0.1',
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
    addList: vi.fn(),
    addBreak: vi.fn(),
    addLink: vi.fn(),
  };

  summary.addHeading.mockReturnThis();
  summary.addRaw.mockReturnThis();
  summary.addEOL.mockReturnThis();
  summary.addTable.mockReturnThis();
  summary.addList.mockReturnThis();
  summary.addBreak.mockReturnThis();
  summary.addLink.mockReturnThis();
  summary.write.mockResolvedValue(undefined);

  vi.spyOn(core, 'summary', 'get').mockReturnValue(summary);
};

test('It creates text report from JSON', async () => {
  mockFs({
    '.trivy/scanReport.json': JSON.stringify(JSON_REPORT),
  });

  const result = generateTextReport('eu.grc.io/extenda/test@sha256:123', {
    report: { json: '.trivy/scanReport.json', text: '.trivy/textReport.txt' },
  });

  expect(result).toEqual(true);

  expect(fs.existsSync('.trivy/textReport.txt')).toEqual(true);
  const textReport = fs.readFileSync('.trivy/textReport.txt', 'utf8');
  expect(textReport).toContain('Image: eu.grc.io/extenda/test@sha256:123');
  expect(textReport).toContain('Total: 6');
  expect(textReport).toContain(
    'UNKNOWN: 1, LOW: 2, MEDIUM: 1, HIGH: 1, CRITICAL: 1',
  );
  expect(textReport).toContain('Max CVSS Score: 9.8');
  expect(textReport).toContain('Severity');
  expect(textReport).toContain('Vulnerability');
  expect(textReport).toContain('Package');
  expect(textReport).not.toContain('Title');
  expect(textReport).toContain('Installed');
  expect(textReport).toContain('Fixed');
  expect(textReport).toContain('CVSS Score');
});

test('It skips text report if JSON report is missing', async () => {
  const result = generateTextReport('eu.grc.io/extenda/test@sha256:123', {
    report: { json: '.trivy/scanReport.json', text: '.trivy/textReport.txt' },
  });
  expect(result).toEqual(false);
});

test('It includes all discovered vulnerabilities without deduplication', async () => {
  const jsonReportWithDuplicates = {
    Results: [
      {
        Vulnerabilities: [
          {
            Severity: 'HIGH',
            VulnerabilityID: 'CVE-2025-7777',
            PkgName: 'zlib',
            Title: 'zlib: Some low issue',
            InstalledVersion: '1.2.11',
            FixedVersion: '1.2.12',
            CVSS: {
              nvd: {
                V3Score: 7.0,
              },
            },
          },
          {
            Severity: 'LOW',
            VulnerabilityID: 'CVE-2025-7777',
            PkgName: 'rand',
            Title: 'rand: CVE duplicate issue',
            InstalledVersion: '0.8.0',
            FixedVersion: '0.8.1',
            CVSS: {
              nvd: {
                V3Score: 3.5,
              },
            },
          },
        ],
      },
    ],
  };

  mockFs({
    '.trivy/scanReport.json': JSON.stringify(jsonReportWithDuplicates),
  });

  const result = generateTextReport('eu.grc.io/extenda/test@sha256:123', {
    report: { json: '.trivy/scanReport.json', text: '.trivy/textReport.txt' },
  });

  expect(result).toEqual(true);

  expect(fs.existsSync('.trivy/textReport.txt')).toEqual(true);
  const textReport = fs.readFileSync('.trivy/textReport.txt', 'utf8');
  expect(textReport).toContain('Total: 2');
  expect(textReport).toContain('HIGH: 1');
  expect(textReport).toContain('LOW: 1');
});

test('It sorts vulnerabilities by severity, then VulnerabilityID, then package name', async () => {
  mockFs({
    '.trivy/scanReport.json': JSON.stringify(JSON_REPORT),
  });

  const result = generateTextReport('eu.grc.io/extenda/test@sha256:123', {
    report: { json: '.trivy/scanReport.json', text: '.trivy/textReport.txt' },
  });

  expect(result).toEqual(true);

  expect(fs.existsSync('.trivy/textReport.txt')).toEqual(true);
  const textReport = fs.readFileSync('.trivy/textReport.txt', 'utf8');
  const lines = textReport.split('\n');

  // Find data lines (skip headers)
  const dataLines = [];
  let headerCount = 0;
  for (const line of lines) {
    if (headerCount < 2) {
      headerCount++;
      continue;
    }
    if (line.trim()) {
      dataLines.push(line);
    }
  }

  // Verify they are sorted correctly
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
  let lastSeverityIndex = -1;
  let lastVulnId = '';
  let lastPkg = '';

  for (const line of dataLines) {
    const parts = line.trim().split(/\s+/);
    const severity = parts[0];
    const vulnId = parts[1];
    const pkg = parts[2];

    if (severityOrder.includes(severity)) {
      const currentSeverityIndex = severityOrder.indexOf(severity);

      if (currentSeverityIndex > lastSeverityIndex) {
        // New severity level, reset comparisons
        lastSeverityIndex = currentSeverityIndex;
        lastVulnId = vulnId;
        lastPkg = pkg;
      } else if (currentSeverityIndex === lastSeverityIndex) {
        // Same severity: VulnerabilityID must be >= previous
        expect(vulnId.localeCompare(lastVulnId)).toBeGreaterThanOrEqual(0);

        // When VulnerabilityID is the same, package name must be >= previous
        if (vulnId === lastVulnId) {
          expect(pkg.localeCompare(lastPkg)).toBeGreaterThanOrEqual(0);
        }

        lastVulnId = vulnId;
        lastPkg = pkg;
      }
    }
  }

  // Explicitly verify the two LOW entries with the same CVE are ordered by package name (rand < zlib)
  const lowLines = dataLines.filter((line) => line.startsWith('LOW'));
  expect(lowLines).toHaveLength(2);
  const [firstLowPkg, secondLowPkg] = lowLines.map(
    (line) => line.trim().split(/\s+/)[2],
  );
  expect(firstLowPkg).toEqual('rand');
  expect(secondLowPkg).toEqual('zlib');
});

test('It creates summary from json report', () => {
  mockFs({
    '.trivy/scanReport.json': JSON.stringify(JSON_REPORT),
    '.trivy/textReport.txt': 'placeholder',
  });

  const summary = generateSummary('ubuntu', {
    report: {
      json: '.trivy/scanReport.json',
      text: '.trivy/textReport.txt',
    },
  });

  expect(summary).toEqual({
    message: `Found 6 vulnerabilities (1 CRITICAL, 1 HIGH, 1 MEDIUM, 2 LOW, 1 UNKNOWN). Max CVSS Score: 9.8.
Image: ubuntu`,
    high: 1,
    critical: 1,
    cvssScore: 9.8,
  });
});

test('It skips summary if json report is missing', () => {
  const summary = generateSummary('ubuntu', {
    report: {
      json: '.trivy/scanReport.json',
      text: '.trivy/textReport.txt',
    },
  });

  expect(summary).toEqual({
    message: `Found 0 vulnerabilities (0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW, 0 UNKNOWN). Max CVSS Score: 0.0.
Image: ubuntu`,
    high: 0,
    critical: 0,
    cvssScore: 0,
  });
});

test('It picks max CVSS V3Score from any CVSS source key', () => {
  const jsonReportWithCustomCvssSource = {
    Results: [
      {
        Vulnerabilities: [
          {
            Severity: 'HIGH',
            VulnerabilityID: 'CVE-2026-1234',
            PkgName: 'custom-pkg',
            Title: 'custom issue',
            InstalledVersion: '1.0.0',
            FixedVersion: '1.0.1',
            CVSS: {
              nvd: {
                V3Score: 7.4,
              },
              internalSource: {
                V3Score: 9.1,
              },
            },
          },
        ],
      },
    ],
  };

  mockFs({
    '.trivy/scanReport.json': JSON.stringify(jsonReportWithCustomCvssSource),
    '.trivy/textReport.txt': 'placeholder',
  });

  const summary = generateSummary('ubuntu', {
    report: {
      json: '.trivy/scanReport.json',
      text: '.trivy/textReport.txt',
    },
  });

  expect(summary).toEqual({
    message:
      'Found 1 vulnerabilities (0 CRITICAL, 1 HIGH, 0 MEDIUM, 0 LOW, 0 UNKNOWN). Max CVSS Score: 9.1.\nImage: ubuntu',
    high: 1,
    critical: 0,
    cvssScore: 9.1,
  });
});

test('It writes trivy results to the GitHub job summary', async () => {
  mockFs({
    '.trivy/report.json': JSON.stringify(JSON_REPORT),
  });
  createSummaryMock();

  const summaryLink = await writeTrivyJobSummary({
    image: 'ubuntu@sha256:manifest',
    report: { json: '.trivy/report.json' },
  });

  expect(summaryLink).toEqual(expect.any(String));
  expect(core.summary.addHeading).toHaveBeenCalledWith('Trivy report');
  expect(core.summary.addRaw).toHaveBeenCalledWith(
    'Found 6 vulnerabilities (1 CRITICAL, 1 HIGH, 1 MEDIUM, 2 LOW, 1 UNKNOWN). Max CVSS Score: 9.8.',
    true,
  );
  expect(core.summary.addRaw).toHaveBeenCalledWith('Image: ', false);
  expect(core.summary.addRaw).toHaveBeenCalledWith(
    '<code>ubuntu@sha256:manifest</code>',
    true,
  );

  const tableRows = core.summary.addTable.mock.calls[0][0];
  expect(tableRows[0]).toEqual([
    { data: 'Severity', header: true },
    { data: 'Vulnerability', header: true },
    { data: 'Package', header: true },
    { data: 'Title', header: true },
    { data: 'Installed', header: true },
    { data: 'Fixed', header: true },
    { data: 'CVSS Score', header: true },
  ]);
  expect(tableRows[1][0]).toEqual('CRITICAL');
  expect(tableRows[2][0]).toEqual('HIGH');
  expect(tableRows[3][0]).toEqual('MEDIUM');
  expect(tableRows[4][0]).toEqual('LOW');
  expect(tableRows[5][0]).toEqual('LOW');
  expect(tableRows[6][0]).toEqual('UNKNOWN');
  expect(core.summary.write).toHaveBeenCalledTimes(1);
});

test('It writes summary with image link for GCR images', async () => {
  mockFs({
    '.trivy/report.json': JSON.stringify(JSON_REPORT),
  });
  createSummaryMock();

  await writeTrivyJobSummary({
    image: 'eu.gcr.io/ubuntu@sha256:manifest',
    report: { json: '.trivy/report.json' },
  });

  expect(core.summary.addLink).toHaveBeenCalledWith(
    'eu.gcr.io/ubuntu@sha256:manifest',
    'https://eu.gcr.io/ubuntu@sha256:manifest',
  );
});

test('It skips summary when the trivy json report is missing', async () => {
  createSummaryMock();

  const summaryUrl = await writeTrivyJobSummary({
    image: 'ubuntu@sha256:manifest',
    report: { json: '.trivy/report.json' },
  });

  expect(summaryUrl).toBeNull();
  expect(core.info).toHaveBeenCalledWith(
    'Trivy JSON report not found, skipping job summary.',
  );
  expect(core.summary.write).not.toHaveBeenCalled();
});
