const core = require('@actions/core');
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
  let stderr = '';
  const status = await exec.exec(kustomize, args, {
    cwd: 'kustomize',
    listeners: {
      stdout: (data) => {
        stdout += data.toString('utf8');
      },
      stderr: (data) => {
        stderr += data.toString('utf8');
      },
    },
  }).catch((err) => {
    core.error(`kustomize execution failed: ${err.message}`);
    stdout += stderr;
  });

  return {
    status,
    output: stdout ? stdout.trim() : '',
  };
};

module.exports = execKustomize;
