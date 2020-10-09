const exec = require('@actions/exec');
const { loadTool } = require('../../utils');

const KUSTOMIZE_VERSION = '3.8.4';
const KUSTOMIZE_URI = `https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize/v${KUSTOMIZE_VERSION}/kustomize_v${KUSTOMIZE_VERSION}_linux_amd64.tar.gz`;

const execKustomize = async (args) => {
  const kustomize = await loadTool({
    tool: 'kustomize',
    binary: 'kustomize',
    version: KUSTOMIZE_VERSION,
    downloadUrl: KUSTOMIZE_URI,
  });
  let stdout = '';
  await exec.exec(kustomize, args, {
    cwd: 'kustomize',
    listeners: {
      stdout: (data) => {
        stdout += data.toString('utf8');
      },
    },
  });

  return stdout.trim();
};

module.exports = execKustomize;
