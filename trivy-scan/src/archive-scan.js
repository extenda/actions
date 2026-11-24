import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { exec } from '@actions/exec';
import * as tc from '@actions/tool-cache';

import { loadTool } from '../../utils/src/index.js';
import setupTrivy from './setup-trivy.js';
import { generateSummary, generateTextReport } from './trivy-report.js';

// Trivy does not detect jlink-built Java runtimes, so Syft + Grype cover them.
const SYFT_VERSION = '1.18.1';
const GRYPE_VERSION = '0.122.1';

const outputs = {
  sbom: {
    spdx: '.trivy/sbom.spdx.json',
    cdx: '.trivy/sbom.cdx.json',
  },
  report: {
    json: '.trivy/report.json',
    text: '.trivy/report.txt',
  },
};

const grypeReport = '.trivy/grype.json';
const trivyReport = '.trivy/trivy-rootfs.json';

const anchoreTool = (tool, version) =>
  loadTool({
    tool,
    binary: tool,
    version,
    downloadUrl: `https://github.com/anchore/${tool}/releases/download/v${version}/${tool}_${version}_linux_amd64.tar.gz`,
  });

const toCvss = (entries, cvss = {}) => {
  for (const entry of entries || []) {
    const score = Number(entry?.metrics?.baseScore);
    if (!String(entry?.version).startsWith('3') || !Number.isFinite(score)) {
      continue;
    }
    const source = entry.source || 'grype';
    if (!cvss[source] || cvss[source].V3Score < score) {
      cvss[source] = { V3Score: score, V3Vector: entry.vector };
    }
  }
  return cvss;
};

/**
 * Convert Grype matches to Trivy vulnerabilities, so the existing report, summary and threshold logic apply.
 * GHSA ids are replaced by their related CVE id when there is one, to match Trivy's ids.
 */
export const grypeToTrivy = (grypeJson, severities) =>
  (grypeJson?.matches || [])
    .map(({ vulnerability, relatedVulnerabilities = [], artifact }) => {
      const cve = relatedVulnerabilities.find((r) => r.id?.startsWith('CVE-'));
      const cvss = toCvss(vulnerability.cvss);
      relatedVulnerabilities.forEach((r) => toCvss(r.cvss, cvss));
      return {
        VulnerabilityID:
          cve && !vulnerability.id.startsWith('CVE-')
            ? cve.id
            : vulnerability.id,
        PkgName: artifact.name,
        PkgPath: artifact.locations?.[0]?.path,
        InstalledVersion: artifact.version,
        FixedVersion: (vulnerability.fix?.versions || []).join(', '),
        Severity: (vulnerability.severity || 'UNKNOWN').toUpperCase(),
        Title: vulnerability.description,
        CVSS: cvss,
      };
    })
    .filter((v) => severities.includes(v.Severity));

/**
 * Merge Grype findings into the Trivy report. Findings Trivy already reported are not repeated.
 */
export const mergeReports = (trivyJson, grypeVulnerabilities) => {
  const results = trivyJson?.Results || [];
  const seen = new Set(
    results.flatMap((r) =>
      (r.Vulnerabilities || []).map(
        (v) => `${v.VulnerabilityID}@${v.InstalledVersion}`,
      ),
    ),
  );
  const extra = grypeVulnerabilities.filter(
    (v) => !seen.has(`${v.VulnerabilityID}@${v.InstalledVersion}`),
  );
  return {
    ...trivyJson,
    Results: [
      ...results,
      { Target: 'grype', Class: 'grype', Vulnerabilities: extra },
    ],
  };
};

/**
 * Scan a ZIP archive, such as a managed service bundle with a jlink Java runtime. Syft creates the SBOMs, Grype scans
 * the SBOM and Trivy scans the extracted files. The results are merged into one Trivy JSON report.
 *
 * @param archive - Path to the ZIP archive to scan
 * @param version - The Trivy version to use
 * @param severity - The severity levels to report on, e.g. "CRITICAL,HIGH"
 * @param ignoreUnfixed - Whether to ignore unfixed vulnerabilities
 * @param timeout - The maximum time spent on each trivy invocation, e.g. `5m0s`
 * @param scoreThreshold - The CVSS score threshold above which vulnerabilities should be considered critical (default: 9.5)
 * @return {Promise<{success: boolean, image: string, summary: {message: string, critical: int, high: int, cvssScore: Number}, sbom: {spdx: string, cdx: string}, report: {json: string, text: string}}>} the same result shape as an image scan, with the archive name as `image`.
 */
export default async function archiveScan(
  archive,
  {
    version = 'latest',
    severity = 'CRITICAL,HIGH',
    ignoreUnfixed = true,
    timeout = '5m0s',
    scoreThreshold = 9.5,
  } = {},
) {
  if (os.platform() !== 'linux') {
    throw new Error('Archive scans are only supported on Linux runners.');
  }
  if (!fs.existsSync(archive)) {
    throw new Error(`Archive not found: ${archive}`);
  }

  const [trivy, syft, grype] = await Promise.all([
    setupTrivy(version),
    anchoreTool('syft', SYFT_VERSION),
    anchoreTool('grype', GRYPE_VERSION),
  ]);

  fs.mkdirSync('.trivy', { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trivy-archive-'));

  try {
    // extractZip runs unzip from inside dir, so the archive path must be absolute.
    await tc.extractZip(path.resolve(archive), dir);

    await exec(syft, [
      `dir:${dir}`,
      '--quiet',
      '--output',
      `cyclonedx-json=${outputs.sbom.cdx}`,
      '--output',
      `spdx-json=${outputs.sbom.spdx}`,
    ]);

    const grypeArgs = [
      `sbom:${outputs.sbom.cdx}`,
      '--quiet',
      '--output',
      'json',
      '--file',
      grypeReport,
    ];
    if (ignoreUnfixed) {
      grypeArgs.push('--only-fixed');
    }
    await exec(grype, grypeArgs);

    const trivyArgs = [
      'rootfs',
      '--scanners',
      'vuln',
      '--format',
      'json',
      '--severity',
      severity,
      '--exit-code',
      '0',
      '--no-progress',
      '--db-repository',
      'ghcr.io/aquasecurity/trivy-db:2,public.ecr.aws/aquasecurity/trivy-db:2',
      '--timeout',
      timeout,
      '--output',
      trivyReport,
    ];
    if (ignoreUnfixed) {
      trivyArgs.push('--ignore-unfixed');
    }
    await exec(trivy, [...trivyArgs, dir]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
  const severities = severity.split(',').map((s) => s.trim().toUpperCase());
  const report = mergeReports(
    readJson(trivyReport),
    grypeToTrivy(readJson(grypeReport), severities),
  );
  fs.writeFileSync(outputs.report.json, JSON.stringify(report), 'utf8');

  const name = path.basename(archive);
  generateTextReport(name, outputs);
  const summary = generateSummary(name, outputs);

  return {
    success: summary.cvssScore < scoreThreshold,
    summary,
    image: name,
    ...outputs,
  };
}
