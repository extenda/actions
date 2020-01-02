const core = require('@actions/core');
const exec = require('@actions/exec');
// const os = require('os');
// const path = require('path');
// const { checkEnv, loadTool } = require('../../utils');
const { loadTool } = require('../../utils');
const { pkgbuilder } = require('./pkgbuilder');

const packageBuilderCommand = async (
  builder, packageName, workingDir, outputDir, sourcePaths, sourceFilePaths) => exec.exec(builder,
  ['--pn', packageName, '--wd', workingDir, '--od', outputDir, '--sp', sourcePaths, '--sfp', sourceFilePaths]);

const run = async () => {
  const binaryName = await pkgbuilder.getBinaryName();
  const binaryVersion = 'v1.0.0';
  const appName = 'RS.InstallerPackageBuilder.Core.Console';

  try {
    const downloadUrlNexus = `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${binaryName}`;
    const pn = core.getInput('packageName', { required: false });
    const wd = core.getInput('workingDir', { required: true });
    const od = core.getInput('outputDir', { required: true });
    const sp = core.getInput('sourcePaths', { required: false });
    const sfp = core.getInput('sourceFilePaths', { required: false });

    const builder = await loadTool({
      tool: 'InstallerPackageBuilder.Core.Console',
      binary: binaryName,
      version: binaryVersion, // Version must be semver and 'latest' is not.
      downloadUrl: downloadUrlNexus,
    });

    await packageBuilderCommand(builder, pn, wd, od, sp, sfp);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
