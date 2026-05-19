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
const TABLE_HEADERS = [
  'Severity',
  'Vulnerability',
  'Package',
  'Title',
  'Installed',
  'Fixed',
  'CVSS Score',
];

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

const getMaxCvssScore = (cvssObject) => {
  if (!cvssObject || typeof cvssObject !== 'object') {
    return 0;
  }

  let maxScore = 0;

  // Check every source entry and pick the highest V3Score.
  for (const source of Object.values(cvssObject)) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    const score = Number(source.V3Score);
    if (Number.isFinite(score)) {
      maxScore = Math.max(maxScore, score);
    }
  }

  return maxScore;
};

const getAllVulnerabilities = (jsonReport) => {
  const vulnerabilities = [];

  if (!Array.isArray(jsonReport?.Results)) {
    return vulnerabilities;
  }

  for (const result of jsonReport.Results) {
    if (!Array.isArray(result.Vulnerabilities)) {
      continue;
    }

    for (const vulnerability of result.Vulnerabilities) {
      const cvssScore = getMaxCvssScore(vulnerability.CVSS);

      vulnerabilities.push({
        severity: vulnerability.Severity || '',
        id: vulnerability.VulnerabilityID || '',
        pkg: vulnerability.PkgName || '',
        title: vulnerability.Title
          ? vulnerability.Title.replaceAll('\n', ' ')
          : '',
        installedVersion: vulnerability.InstalledVersion || '',
        fixedVersion: vulnerability.FixedVersion || '',
        cvssScore,
      });
    }
  }

  return vulnerabilities;
};

const sortVulnerabilities = (vulnerabilities) =>
  [...vulnerabilities].sort((a, b) => {
    // Sort by severity first
    const severityDiff =
      (SEVERITY_ORDER[a.severity] || 6) - (SEVERITY_ORDER[b.severity] || 6);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    // Then by vulnerabilityID
    const idDiff = a.id.localeCompare(b.id);
    if (idDiff !== 0) {
      return idDiff;
    }

    // Finally by package name
    return a.pkg.localeCompare(b.pkg);
  });

const countSeverities = (vulnerabilities) => {
  const counts = {
    total: vulnerabilities.length,
    UNKNOWN: 0,
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
    maxCvssScore: 0,
  };

  for (const vulnerability of vulnerabilities) {
    if (Object.hasOwn(counts, vulnerability.severity)) {
      counts[vulnerability.severity] += 1;
    }
    counts.maxCvssScore = Math.max(
      counts.maxCvssScore,
      vulnerability.cvssScore || 0,
    );
  }

  return counts;
};

const buildSummaryFromCounts = (image, counts) => ({
  message: `Found ${counts.total} vulnerabilities (${counts.CRITICAL} CRITICAL, ${counts.HIGH} HIGH, ${counts.MEDIUM} MEDIUM, ${counts.LOW} LOW, ${counts.UNKNOWN} UNKNOWN). Max CVSS Score: ${counts.maxCvssScore.toFixed(1)}.
Image: ${image}`,
  high: counts.HIGH,
  critical: counts.CRITICAL,
  cvssScore: counts.maxCvssScore,
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
  totalsLine += `)\nMax CVSS Score: ${counts.maxCvssScore.toFixed(1)}\n`;

  return totalsLine;
};

const buildTextTable = (vulnerabilities) => {
  const columnWidths = [
    10, // Severity
    20, // Vulnerability
    50, // Package
    10, // Installed
    10, // Fixed
  ];

  // The title and score columns are not included in text report.
  let table =
    `${pad(TABLE_HEADERS[0], columnWidths[0])} ` +
    `${pad(TABLE_HEADERS[1], columnWidths[1])} ` +
    `${pad(TABLE_HEADERS[2], columnWidths[2])} ` +
    `${pad(TABLE_HEADERS[4], columnWidths[3])} ` +
    `${pad(TABLE_HEADERS[5], columnWidths[4])}\n`;

  for (const width of columnWidths) {
    table += '-'.repeat(width) + ' ';
  }
  table = table.trimEnd() + '\n';

  for (const vulnerability of vulnerabilities) {
    table +=
      `${pad(vulnerability.severity, columnWidths[0])} ` +
      `${pad(vulnerability.id, columnWidths[1])} ` +
      `${pad(vulnerability.pkg, columnWidths[2])} ` +
      `${pad(vulnerability.installedVersion, columnWidths[3])} ` +
      `${pad(vulnerability.fixedVersion, columnWidths[4])}\n`;
  }

  if (vulnerabilities.length === 0) {
    table += 'No vulnerabilities found\n';
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
      vulnerability.installedVersion,
      vulnerability.fixedVersion,
      vulnerability.cvssScore.toFixed(1),
    ]);
  }

  if (vulnerabilities.length === 0) {
    rows.push(['', '', '', 'No vulnerabilities found', '', '', '']);
  }

  return rows;
};

const getReportData = (jsonReport) => {
  const vulnerabilities = sortVulnerabilities(
    getAllVulnerabilities(jsonReport),
  );
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
    return null;
  }

  const { vulnerabilities, counts } = getReportData(jsonReport);

  core.summary.addHeading('Trivy report');
  core.summary
    .addRaw(
      `Found ${counts.total} vulnerabilities (${counts.CRITICAL} CRITICAL, ${counts.HIGH} HIGH, ${counts.MEDIUM} MEDIUM, ${counts.LOW} LOW, ${counts.UNKNOWN} UNKNOWN). Max CVSS Score: ${counts.maxCvssScore.toFixed(1)}.`,
      true,
    )
    .addBreak()
    .addRaw('Image: ', false);
  if (scanResult.image.includes('gcr.io')) {
    core.summary.addLink(scanResult.image, `https://${scanResult.image}`);
  } else {
    core.summary.addRaw(`<code>${scanResult.image}</code>`, true);
  }
  core.summary
    .addEOL()
    .addBreak()
    .addBreak()
    .addEOL()
    .addTable(buildMarkdownTableRows(vulnerabilities));

  await core.summary.write();

  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;

  // This is strictly not the summary URL, but hopefully good enough.
  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}
