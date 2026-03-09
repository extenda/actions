import fs from 'node:fs';

import * as core from '@actions/core';

const SEVERITY_ORDER = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  UNKNOWN: 5,
};

const SEVERITY_TOTAL_ORDER = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const getUniqueVulnerabilities = (jsonReport) => {
  const seenCveIds = new Set();
  const vulnerabilities = [];

  if (!Array.isArray(jsonReport.Results)) {
    return vulnerabilities;
  }

  for (const result of jsonReport.Results) {
    if (!Array.isArray(result.Vulnerabilities)) {
      continue;
    }

    for (const vulnerability of result.Vulnerabilities) {
      const id = vulnerability.VulnerabilityID || '';
      if (seenCveIds.has(id)) {
        continue;
      }
      seenCveIds.add(id);

      vulnerabilities.push({
        severity: vulnerability.Severity || '',
        id,
        pkg: vulnerability.PkgName || '',
        title: vulnerability.Title
          ? vulnerability.Title.replace(/\n/g, ' ')
          : '',
      });
    }
  }

  return vulnerabilities;
};

const sortBySeverity = (vulnerabilities) =>
  [...vulnerabilities].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] || 6) - (SEVERITY_ORDER[b.severity] || 6),
  );

const countSeverities = (vulnerabilities) => {
  const counts = {
    total: vulnerabilities.length,
    UNKNOWN: 0,
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const vulnerability of vulnerabilities) {
    if (Object.hasOwn(counts, vulnerability.severity)) {
      counts[vulnerability.severity] += 1;
    }
  }

  return counts;
};

const buildTableRows = (vulnerabilities) => {
  const rows = [
    [
      { data: 'Severity', header: true },
      { data: 'Vulnerability', header: true },
      { data: 'Package', header: true },
      { data: 'Title', header: true },
    ],
  ];

  for (const vulnerability of vulnerabilities) {
    rows.push([
      vulnerability.severity,
      vulnerability.id,
      vulnerability.pkg,
      vulnerability.title,
    ]);
  }

  if (vulnerabilities.length === 0) {
    rows.push(['-', '-', '-', '_No vulnerabilities found_']);
  }

  return rows;
};

export default async function writeTrivyJobSummary(scanResult) {
  const jsonReportPath = scanResult?.report?.json;

  if (!jsonReportPath || !fs.existsSync(jsonReportPath)) {
    core.info('Trivy JSON report not found, skipping job summary.');
    return false;
  }

  const jsonReport = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
  const vulnerabilities = sortBySeverity(getUniqueVulnerabilities(jsonReport));
  const counts = countSeverities(vulnerabilities);

  const totals = SEVERITY_TOTAL_ORDER.map(
    (severity) => `${severity}: ${counts[severity]}`,
  ).join(', ');

  core.summary
    .addHeading('Trivy Scan Report')
    .addRaw(
      `Total vulnerabilities found on ${scanResult.image}: ${counts.total} (${totals})`,
    )
    .addEOL()
    .addEOL()
    .addTable(buildTableRows(vulnerabilities));

  await core.summary.write();
  return true;
}
