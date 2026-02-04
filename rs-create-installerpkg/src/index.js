import { fileURLToPath } from 'node:url';

import * as core from '@actions/core';

import { checkEnv, run } from '../../utils/src/index.js';
import { buildPackage } from './pkgbuilder.js';

const action = async () => {
  try {
    core.info('Starting to build installer package');

    checkEnv(['NEXUS_USERNAME', 'NEXUS_PASSWORD']);

    const publishPackageInput = core.getInput('publish-package', {
      required: false,
    });
    let publishPackage;
    if (publishPackageInput === 'true') {
      publishPackage = true;
    } else {
      publishPackage = false;
    }

    const binaryVersion = core.getInput('tool-version', { required: true });
    const branch = core.getInput('branch-name-short', {
      required: publishPackage,
    });
    const builderType = core.getInput('builder-type', { required: false });
    const outputDir = core.getInput('output-dir', { required: true });
    const packageName = core.getInput('package-name', { required: false });
    const packageVersion = core.getInput('package-version', { required: true });
    const publishUrl = core.getInput('publish-root-url', {
      required: publishPackage,
    });
    const sourceFilePaths = core.getInput('source-filePaths', {
      required: false,
    });
    const sourcePaths = core.getInput('source-paths', { required: false });
    const workingDir = core.getInput('working-dir', { required: true });
    const searchFilter = core.getInput('search-filter', { required: false });

    await buildPackage({
      binaryVersion,
      branch,
      builderType,
      outputDir,
      packageName,
      packageVersion,
      publishPackage,
      publishUrl,
      sourceFilePaths,
      sourcePaths,
      workingDir,
      searchFilter,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(action);
}

export default action;
