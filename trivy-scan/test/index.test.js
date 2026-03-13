import * as core from '@actions/core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { withGcloud } from '../../setup-gcloud/src/index.js';
import notifySlack from '../../slack-notify/src/slack-notify.js';
import authenticateDocker from '../src/docker-auth.js';
import action from '../src/index.js';
import { writeTrivyJobSummary as trivyJobSummary } from '../src/trivy-report.js';
import trivyScan from '../src/trivy-scan.js';
import uploadSbom from '../src/upload-sbom.js';

vi.mock('@actions/core');
vi.mock('../src/docker-auth.js');
vi.mock('../src/upload-sbom.js');
vi.mock('../src/trivy-report.js');
vi.mock('../src/trivy-scan.js');
vi.mock('../../slack-notify/src/slack-notify.js');
vi.mock('../../setup-gcloud/src/index.js');

beforeEach(() => {
  withGcloud.mockImplementation(async (serviceAccountKey, fn) =>
    fn('test-project'),
  );
  authenticateDocker.mockResolvedValueOnce(0);
});

afterEach(() => {
  vi.resetAllMocks();
});

const setInput = (
  failOnVulnerabilities,
  notifySlackOnVulnerabilities,
  uploadSbomArtifact = false,
  attestationKeyUri = '',
) => {
  core.getInput
    .mockReturnValueOnce('ubuntu') // image
    .mockReturnValueOnce('sa') // service-account-key
    .mockReturnValueOnce('latest') // trivy-version
    .mockReturnValueOnce('CRITICAL,HIGH') // severity
    .mockReturnValueOnce('5m0s') // timeout
    .mockReturnValueOnce(attestationKeyUri); // sbom-attestation-key-uri
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
    timeout: '5m0s',
  });

  expect(authenticateDocker).toHaveBeenCalledWith('ubuntu');
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
  expect(authenticateDocker).toHaveBeenCalledWith('ubuntu');

  expect(trivyScan).toHaveBeenCalledWith('ubuntu', {
    version: 'latest',
    severity: 'CRITICAL,HIGH',
    ignoreUnfixed: false,
    timeout: '5m0s',
  });

  expect(authenticateDocker).toHaveBeenCalledWith('ubuntu');
  expect(notifySlack).not.toHaveBeenCalled();
  expect(core.setFailed).toHaveBeenCalledWith(
    'Vulnerabilities found in image scan. Check the report for details: undefined',
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

  expect(authenticateDocker).toHaveBeenCalledWith('ubuntu');
  expect(trivyScan).toHaveBeenCalledWith('ubuntu', {
    version: 'latest',
    severity: 'CRITICAL,HIGH',
    ignoreUnfixed: false,
    timeout: '5m0s',
  });

  expect(notifySlack).toHaveBeenCalledWith('sa', 'Summary', '', 'Report');
  expect(core.setFailed).toHaveBeenCalledWith(
    'Vulnerabilities found in image scan. Check the report for details: undefined',
  );
  expect(trivyJobSummary).toHaveBeenCalledWith({
    success: false,
    summary: { message: 'Summary' },
    report: { text: 'Report' },
  });
});

test('Action maps sbom attestation key input before uploading SBOMs', async () => {
  const scanResult = {
    success: true,
    summary: { message: 'Summary' },
    sbom: { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
  };
  const defaultAttestationKeyUri =
    'gcpkms://projects/platform-prod-2481/locations/europe-west1/keyRings/sbom-keyring/cryptoKeys/sbom-attestor-key/cryptoKeyVersions/1';

  setInput(false, false, true);
  trivyScan.mockResolvedValueOnce(scanResult);
  uploadSbom.mockResolvedValueOnce(undefined);
  await action();

  expect(authenticateDocker).toHaveBeenCalledWith('ubuntu');
  expect(uploadSbom).toHaveBeenNthCalledWith(
    1,
    'ubuntu',
    scanResult.sbom,
    defaultAttestationKeyUri,
  );

  setInput(false, false, true, 'none');
  trivyScan.mockResolvedValueOnce(scanResult);
  uploadSbom.mockResolvedValueOnce(undefined);
  await action();

  expect(uploadSbom).toHaveBeenNthCalledWith(
    2,
    'ubuntu',
    scanResult.sbom,
    undefined,
  );

  const attestationKeyUri =
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom';

  setInput(false, false, true, attestationKeyUri);
  trivyScan.mockResolvedValueOnce(scanResult);
  uploadSbom.mockResolvedValueOnce(undefined);
  await action();

  expect(uploadSbom).toHaveBeenNthCalledWith(
    3,
    'ubuntu',
    scanResult.sbom,
    attestationKeyUri,
  );
});
