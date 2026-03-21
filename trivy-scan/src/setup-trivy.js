import os from 'node:os';

import * as core from '@actions/core';

import { loadTool } from '../../utils/src/index.js';

const determineVersion = async (providedVersion) => {
  const gitTag = providedVersion.startsWith('v')
    ? providedVersion
    : `v${providedVersion}`;
  const response = await fetch(
    `https://api.github.com/repos/aquasecurity/trivy/releases/tags/${gitTag}`,
  );
  if (!response.ok) {
    throw new Error(
      `Invalid Trivy version: ${providedVersion}. Response: ${response.status} ${response.statusText}`,
    );
  }
  const data = await response.json();
  return data.tag_name.replace(/^v/, '');
};

/**
 * Setup Trivy by downloading the specified version and returning the path to the binary.
 * @param version - The semantic version of Trivy to install (e.g., '0.50.0' or 'v0.50.0')
 * @return {Promise<string>} the path to the Trivy binary
 */
export default async function setupTrivy(version) {
  const trivyVersion = await determineVersion(version);
  const windows = os.platform() === 'win32';

  core.info(`Install trivy ${trivyVersion}...`);

  return loadTool({
    tool: 'trivy',
    binary: windows ? 'trivy.exe' : 'trivy',
    version: trivyVersion,
    downloadUrl: `https://github.com/aquasecurity/trivy/releases/download/v${trivyVersion}/trivy_${trivyVersion}_${windows ? 'windows-64bit.zip' : 'Linux-64bit.tar.gz'}`,
  });
}
