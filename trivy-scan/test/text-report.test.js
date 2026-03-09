import fs from 'node:fs';

import mockFs from 'mock-fs';
import { afterEach, expect, test, vi } from 'vitest';

import { generateSummary, generateTextReport } from '../src/text-report.js';

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
          Severity: 'MEDIUM',
          VulnerabilityID: 'CVE-2025-8888',
          PkgName: 'curl',
          Title: 'curl: Some medium issue',
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
          Title: 'rand: CVE duplicate issue',
        },
        {
          Severity: 'UNKNOWN',
          VulnerabilityID: 'CVE-2025-6666',
          PkgName: 'foo',
          Title: 'foo: Unknown issue',
        },
      ],
    },
  ],
};

afterEach(() => {
  mockFs.restore();
  vi.resetAllMocks();
});

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
  expect(textReport).toEqual(`Image: eu.grc.io/extenda/test@sha256:123
Total: 5 (UNKNOWN: 1, LOW: 1, MEDIUM: 1, HIGH: 1, CRITICAL: 1)
Severity   Vulnerability        Package                        Title
---------- -------------------- ------------------------------ ----------------------------------------------------------------
CRITICAL   CVE-2025-9999        openssl                        openssl: Buffer overflow
HIGH       CVE-2025-9900        libtiff-dev                    libtiff: Libtiff Write-What-Where
MEDIUM     CVE-2025-8888        curl                           curl: Some medium issue
LOW        CVE-2025-7777        zlib                           zlib: Some low issue
UNKNOWN    CVE-2025-6666        foo                            foo: Unknown issue
`);
});

test('It skips text report if JSON report is missing', async () => {
  const result = generateTextReport('eu.grc.io/extenda/test@sha256:123', {
    report: { json: '.trivy/scanReport.json', text: '.trivy/textReport.txt' },
  });
  expect(result).toEqual(false);
});

test('It preserves first occurrence of duplicate CVE IDs', async () => {
  const jsonReportWithDuplicates = {
    Results: [
      {
        Vulnerabilities: [
          {
            Severity: 'HIGH',
            VulnerabilityID: 'CVE-2025-7777',
            PkgName: 'zlib',
            Title: 'zlib: Some low issue',
          },
          {
            Severity: 'LOW',
            VulnerabilityID: 'CVE-2025-7777',
            PkgName: 'rand',
            Title: 'rand: CVE duplicate issue',
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
  expect(textReport).toEqual(`Image: eu.grc.io/extenda/test@sha256:123
Total: 1 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 1, CRITICAL: 0)
Severity   Vulnerability        Package                        Title
---------- -------------------- ------------------------------ ----------------------------------------------------------------
HIGH       CVE-2025-7777        zlib                           zlib: Some low issue
`);
});

test('It sorts vulnerabilities by severity', async () => {
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
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
  let lastSeverityIndex = -1;
  for (const line of lines) {
    const severity = line.trim().split(/\s+/)[0];
    if (severityOrder.includes(severity)) {
      const currentSeverityIndex = severityOrder.indexOf(severity);
      expect(currentSeverityIndex).toBeGreaterThanOrEqual(lastSeverityIndex);
      lastSeverityIndex = currentSeverityIndex;
    }
  }
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
    message: `Total vulnerabilities found on ubuntu: 5
  High: 1
  Critical: 1
  `,
    high: 1,
    critical: 1,
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
    message: `Total vulnerabilities found on ubuntu: 0
  High: 0
  Critical: 0
  `,
    high: 0,
    critical: 0,
  });
});
