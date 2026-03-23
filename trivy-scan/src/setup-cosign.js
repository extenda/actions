import os from 'node:os';

import * as core from '@actions/core';
import { loadTool } from 'action-utils';

export default async function setupCosign() {
  const version = '3.0.5';
  const windows = os.platform() === 'win32';

  core.info(`Install cosign ${version}...`);

  return loadTool({
    tool: 'cosign',
    binary: windows ? 'cosign.exe' : 'cosign',
    version: version,
    downloadUrl: `https://github.com/sigstore/cosign/releases/download/v${version}/cosign-${windows ? 'windows-amd64.exe' : 'linux-amd64'}`,
  });
}
