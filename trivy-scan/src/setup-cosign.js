import os from 'node:os';

import { loadTool } from '../../utils/src/index.js';

const determineVersion = async () => {
  const response = await fetch(
    'https://api.github.com/repos/sigstore/cosign/releases/latest',
  );
  if (!response.ok) {
    throw new Error(
      `Failed to resolve latest cosign version. Response: ${response.status} ${response.statusText}`,
    );
  }
  const data = await response.json();
  return data.tag_name.replace(/^v/, '');
};

export default async function setupCosign() {
  const version = await determineVersion();
  const windows = os.platform() === 'win32';

  return loadTool({
    tool: 'cosign',
    binary: windows ? 'cosign.exe' : 'cosign',
    version: version,
    downloadUrl: `https://github.com/sigstore/cosign/releases/download/v${version}/cosign-${windows ? 'windows-amd64.exe' : 'linux-amd64'}`,
  });
}
