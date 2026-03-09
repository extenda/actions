import fs from 'node:fs';

const SEVERITY_ORDER = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4, UNKNOWN: 5 };
const SEVERITY_TOTAL_ORDER = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const HEADERS = ['Severity', 'Vulnerability', 'Package', 'Title'];
const COLUMN_WIDTHS = {
  Severity: 10,
  Vulnerability: 20,
  Package: 30,
  Title: 64,
};

const pad = (str, len) => {
  let s = str || '';
  if (s.length > len) s = s.slice(0, len - 3) + '...';
  return s.padEnd(len, ' ');
};

const getUniqueVulnerabilities = (data) => {
  const seenCveIds = new Set();
  const rows = [];

  if (Array.isArray(data.Results)) {
    for (const result of data.Results) {
      if (Array.isArray(result.Vulnerabilities)) {
        for (const vuln of result.Vulnerabilities) {
          if (seenCveIds.has(vuln.VulnerabilityID)) {
            continue;
          }
          seenCveIds.add(vuln.VulnerabilityID);
          rows.push({
            Severity: vuln.Severity || '',
            ID: vuln.VulnerabilityID || '',
            Pkg: vuln.PkgName || '',
            Title: vuln.Title ? vuln.Title.replace(/\n/g, ' ') : '',
          });
        }
      }
    }
  }

  return rows;
};

const sortRowsBySeverity = (rows) =>
  [...rows].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.Severity] || 6) - (SEVERITY_ORDER[b.Severity] || 6),
  );

const countSeverities = (rows) => {
  const counts = {
    total: rows.length,
    UNKNOWN: 0,
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const row of rows) {
    if (Object.hasOwn(counts, row.Severity)) {
      counts[row.Severity] += 1;
    }
  }

  return counts;
};

const buildTotalsLine = (image, serviceName, counts) => {
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

const buildTable = (rows) => {
  let table = HEADERS.map((h) => pad(h, COLUMN_WIDTHS[h])).join(' ') + '\n';
  table += HEADERS.map((h) => '-'.repeat(COLUMN_WIDTHS[h])).join(' ') + '\n';

  for (const row of rows) {
    table +=
      pad(row.Severity, COLUMN_WIDTHS.Severity) +
      ' ' +
      pad(row.ID, COLUMN_WIDTHS.Vulnerability) +
      ' ' +
      pad(row.Pkg, COLUMN_WIDTHS.Package) +
      ' ' +
      pad(row.Title, COLUMN_WIDTHS.Title) +
      '\n';
  }

  if (rows.length === 0) {
    table +=
      pad(
        '_No vulnerabilities found_',
        COLUMN_WIDTHS.Severity +
          COLUMN_WIDTHS.Vulnerability +
          COLUMN_WIDTHS.Package +
          COLUMN_WIDTHS.Title,
      ) + '\n';
  }

  return table;
};

const createCompactReport = (data, image, serviceName) => {
  const rows = sortRowsBySeverity(getUniqueVulnerabilities(data));
  const counts = countSeverities(rows);

  return buildTotalsLine(image, serviceName, counts) + buildTable(rows);
};

const buildSummaryFromJsonReport = (jsonReport, image) => {
  const rows = getUniqueVulnerabilities(jsonReport);
  const counts = countSeverities(rows);

  return {
    message: `Total vulnerabilities found on ${image}: ${counts.total}
  High: ${counts.HIGH}
  Critical: ${counts.CRITICAL}
  `,
    high: counts.HIGH,
    critical: counts.CRITICAL,
  };
};

export function generateSummary(image, outputs) {
  const {
    report: { json: scanReportJson },
  } = outputs;

  const jsonReport = fs.existsSync(scanReportJson)
    ? JSON.parse(fs.readFileSync(scanReportJson, 'utf8'))
    : {};
  return buildSummaryFromJsonReport(jsonReport, image);
}

export function generateTextReport(image, outputs) {
  const {
    report: { json: scanReportJson, text: scanReportText },
  } = outputs;

  if (fs.existsSync(scanReportJson)) {
    const jsonReport = JSON.parse(fs.readFileSync(scanReportJson, 'utf8'));
    const textReport = createCompactReport(jsonReport, image);
    fs.writeFileSync(scanReportText, textReport, 'utf8');
    return true;
  }
  return false;
}
