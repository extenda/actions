const core = require('@actions/core');
const exec = require('@actions/exec');
const { getBuilder } = require('./pkgbuilder');

const packageBuilderCommand = async (
  builder, packageName, workingDir, outputDir, sourcePaths, sourceFilePaths) => exec.exec(builder,
  ['--pn', packageName, '--wd', workingDir, '--od', outputDir, '--sp', sourcePaths, '--sfp', sourceFilePaths]);

const run = async () => {
  const binaryVersion = 'v1.0.0';
  const appName = 'RS.InstallerPackageBuilder.Core.Console';

  try {
    const pn = core.getInput('packageName', { required: false });
    const wd = core.getInput('workingDir', { required: true });
    const od = core.getInput('outputDir', { required: true });
    const sp = core.getInput('sourcePaths', { required: false });
    const sfp = core.getInput('sourceFilePaths', { required: false });

    const builder = await getBuilder(appName, binaryVersion);

    await packageBuilderCommand(builder, pn, wd, od, sp, sfp);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
