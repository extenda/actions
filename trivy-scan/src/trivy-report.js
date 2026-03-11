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
const TABLE_HEADERS = ['Severity', 'Vulnerability', 'Package', 'Title'];
const COLUMN_WIDTHS = {
  Severity: 10,
  Vulnerability: 20,
  Package: 30,
  Title: 64,
};

const pad = (value, length) => {
  let cell = value || '';
  if (cell.length > length) {
    cell = cell.slice(0, length - 3) + '...';
  }
  return cell.padEnd(length, ' ');
};

const readJsonReport = (reportPath) => {
  if (!reportPath || !fs.existsSync(reportPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
};

const getUniqueVulnerabilities = (jsonReport) => {
  const seenCveIds = new Set();
  const vulnerabilities = [];

  if (!Array.isArray(jsonReport?.Results)) {
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
          ? vulnerability.Title.replaceAll(/\n/g, ' ')
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

const buildSummaryFromCounts = (image, counts) => ({
  message: `Total vulnerabilities found on ${image}: ${counts.total}
  High: ${counts.HIGH}
  Critical: ${counts.CRITICAL}
  `,
  high: counts.HIGH,
  critical: counts.CRITICAL,
});

const buildTextTotalsLine = (image, serviceName, counts) => {
  let totalsLine = '';

  if (serviceName) {
    totalsLine += `Service: ${serviceName}\n`;
  }

  totalsLine += `Image: ${image}\nTotal: ${counts.total} (`;
  totalsLine += SEVERITY_TOTAL_ORDER.map(
    (severity) => `${severity}: ${counts[severity]}`,
  ).join(', ');
  totalsLine += ')\n';

  return totalsLine;
};

const buildTextTable = (vulnerabilities) => {
  let table =
    `${pad(TABLE_HEADERS[0], COLUMN_WIDTHS.Severity)} ` +
    `${pad(TABLE_HEADERS[1], COLUMN_WIDTHS.Vulnerability)} ` +
    `${pad(TABLE_HEADERS[2], COLUMN_WIDTHS.Package)} ` +
    `${TABLE_HEADERS[3]}\n`;

  table += TABLE_HEADERS.map((header) =>
    '-'.repeat(COLUMN_WIDTHS[header]),
  ).join(' ');
  table += '\n';

  for (const vulnerability of vulnerabilities) {
    table +=
      `${pad(vulnerability.severity, COLUMN_WIDTHS.Severity)} ` +
      `${pad(vulnerability.id, COLUMN_WIDTHS.Vulnerability)} ` +
      `${pad(vulnerability.pkg, COLUMN_WIDTHS.Package)} ` +
      `${pad(vulnerability.title, COLUMN_WIDTHS.Title).trimEnd()}\n`;
  }

  if (vulnerabilities.length === 0) {
    table +=
      pad(
        '_No vulnerabilities found_',
        COLUMN_WIDTHS.Severity +
          COLUMN_WIDTHS.Vulnerability +
          COLUMN_WIDTHS.Package +
          COLUMN_WIDTHS.Title,
      ).trimEnd() + '\n';
  }

  return table;
};

const buildMarkdownTableRows = (vulnerabilities) => {
  const rows = [
    TABLE_HEADERS.map((header) => ({ data: header, header: true })),
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

const getReportData = (jsonReport) => {
  const vulnerabilities = sortBySeverity(getUniqueVulnerabilities(jsonReport));
  const counts = countSeverities(vulnerabilities);
  return { vulnerabilities, counts };
};

export function generateSummary(image, outputs) {
  const jsonReport = readJsonReport(outputs?.report?.json);
  const { counts } = getReportData(jsonReport || {});
  return buildSummaryFromCounts(image, counts);
}

export function generateTextReport(image, outputs) {
  const jsonReport = readJsonReport(outputs?.report?.json);
  if (!jsonReport) {
    return false;
  }

  const { vulnerabilities, counts } = getReportData(jsonReport);
  const textReport =
    buildTextTotalsLine(image, undefined, counts) +
    buildTextTable(vulnerabilities);

  fs.writeFileSync(outputs.report.text, textReport, 'utf8');
  return true;
}

export async function writeTrivyJobSummary(scanResult) {
  const jsonReport = readJsonReport(scanResult?.report?.json);
  if (!jsonReport) {
    core.info('Trivy JSON report not found, skipping job summary.');
    return false;
  }

  const { vulnerabilities, counts } = getReportData(jsonReport);
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
    .addTable(buildMarkdownTableRows(vulnerabilities));

  await core.summary.write();
  return true;
}
