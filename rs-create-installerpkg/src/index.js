const core = require('@actions/core');
const { buildPackage } = require('./pkgbuilder');
const { checkEnv } = require('../../utils');

const run = async () => {
  try {
    core.info('Starting to build installer package');

    checkEnv(['NEXUS_USERNAME', 'NEXUS_PASSWORD']);

    const packageName = core.getInput('package-name', { required: false });
    const workingDir = core.getInput('working-dir', { required: true });
    const outputDir = core.getInput('output-dir', { required: true });
    const sourcePaths = core.getInput('source-paths', { required: false });
    const sourceFilePaths = core.getInput('source-filePaths', { required: false });
    const builderType = core.getInput('builder-type', { required: false });
    const binaryVersion = core.getInput('tool-version', { required: true });
    const packageVersion = core.getInput('package-version', { required: true });

    await buildPackage({
      builderType,
      binaryVersion,
      packageName,
      workingDir,
      outputDir,
      sourcePaths,
      sourceFilePaths,
      packageVersion,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
