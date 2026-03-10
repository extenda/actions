import * as core from '@actions/core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import notifySlack from '../../slack-notify/src/slack-notify.js';
import action from '../src/index.js';
import { writeTrivyJobSummary as trivyJobSummary } from '../src/trivy-report.js';
import trivyScan from '../src/trivy-scan.js';
import uploadSbom from '../src/upload-sbom.js';

vi.mock('@actions/core');
vi.mock('../src/upload-sbom.js');
vi.mock('../src/trivy-report.js');
vi.mock('../src/trivy-scan.js');
vi.mock('../../slack-notify/src/slack-notify.js');

beforeEach(() => {});

afterEach(() => {
  vi.resetAllMocks();
});

const setInput = (
  failOnVulnerabilities,
  notifySlackOnVulnerabilities,
  uploadSbomArtifact = false,
) => {
  core.getInput
    .mockReturnValueOnce('ubuntu') // image
    .mockReturnValueOnce('sa') // service-account-key
    .mockReturnValueOnce('latest') // trivy-version
    .mockReturnValueOnce('CRITICAL,HIGH') // severity
    .mockReturnValueOnce('5m0s'); // timeout
  core.getBooleanInput
    .mockReturnValueOnce(false) // ignore-unfixed
    .mockReturnValueOnce(failOnVulnerabilities) // fail-on-vulnerabilities
    .mockReturnValueOnce(notifySlackOnVulnerabilities) // notify-slack-on-vulnerabilities
    .mockReturnValueOnce(uploadSbomArtifact); // upload-sbom
};

test('Action runs with successful scan', async () => {
  setInput(false, false);
  trivyScan.mockResolvedValueOnce({
    success: true,
    summary: { message: 'Summary' },
  });

  await action();

  expect(trivyScan).toHaveBeenCalledWith('ubuntu', {
    version: 'latest',
    severity: 'CRITICAL,HIGH',
    ignoreUnfixed: false,
  });

  expect(notifySlack).not.toHaveBeenCalled();
  expect(uploadSbom).not.toHaveBeenCalled();
  expect(trivyJobSummary).toHaveBeenCalledWith({
    success: true,
    summary: { message: 'Summary' },
  });
});

test('Action runs with vulnerabilities found and no notifications', async () => {
  setInput(true, false);
  trivyScan.mockResolvedValueOnce({
    success: false,
    summary: { message: 'Summary' },
    report: { text: 'Report' },
  });

  await action();

  expect(trivyScan).toHaveBeenCalledWith('ubuntu', {
    version: 'latest',
    severity: 'CRITICAL,HIGH',
    ignoreUnfixed: false,
  });

  expect(notifySlack).not.toHaveBeenCalled();
  expect(core.setFailed).toHaveBeenCalledWith(
    'Vulnerabilities found in image scan. Please check the report for details.',
  );
  expect(trivyJobSummary).toHaveBeenCalledWith({
    success: false,
    summary: { message: 'Summary' },
    report: { text: 'Report' },
  });
});

test('Action runs with vulnerabilities found and notifications enabled', async () => {
  setInput(true, true);
  trivyScan.mockResolvedValueOnce({
    success: false,
    summary: { message: 'Summary' },
    report: { text: 'Report' },
  });

  await action();

  expect(trivyScan).toHaveBeenCalledWith('ubuntu', {
    version: 'latest',
    severity: 'CRITICAL,HIGH',
    ignoreUnfixed: false,
  });

  expect(notifySlack).toHaveBeenCalledWith('sa', 'Summary', '', 'Report');
  expect(core.setFailed).toHaveBeenCalledWith(
    'Vulnerabilities found in image scan. Please check the report for details.',
  );
  expect(trivyJobSummary).toHaveBeenCalledWith({
    success: false,
    summary: { message: 'Summary' },
    report: { text: 'Report' },
  });
});
