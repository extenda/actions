const { exec } = require('@actions/exec');
const { loadTool } = require('../../utils');

const opaTest = async (bundleDir) => {
  const binary = 'opa_linux_amd64_static';
  await loadTool({
    tool: 'opa',
    binary,
    version: '0.58.0',
    downloadUrl: 'https://openpolicyagent.org/downloads/v0.58.0/opa_linux_amd64_static',
  });
  return exec(binary, ['test', '--bundle', bundleDir]);
};

module.exports = opaTest;
