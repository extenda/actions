const { exec } = require('@actions/exec');
const { loadTool } = require('../../utils');

const opaTest = async (bundleDir) => {
  const version = '0.58.0';
  return loadTool({
    tool: 'opa',
    binary: 'opa_linux_amd64_static',
    version,
    downloadUrl: `https://openpolicyagent.org/downloads/v${version}/opa_linux_amd64_static`,
  }).then((opa) => exec(opa, ['test', '--bundle', bundleDir]));
};

module.exports = opaTest;
