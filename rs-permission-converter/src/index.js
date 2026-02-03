import core from '@actions/core';

import { checkEnv } from '../../utils';
import { convertPermissions } from './permconv';

const run = async () => {
  try {
    checkEnv(['NEXUS_USERNAME', 'NEXUS_PASSWORD']);

    const binaryVersion =
      core.getInput('tool-version', { required: false }) || '1.0.0';
    const type = core.getInput('type', { required: true });
    const workDir = core.getInput('work-directory', { required: true });
    const permFile = core.getInput('permission-file', { required: true });
    const sqlFile = core.getInput('sql-file', { required: false });
    const outputDir = core.getInput('output-dir', { required: false });

    await convertPermissions({
      type,
      binaryVersion,
      workDir,
      permFile,
      sqlFile,
      outputDir,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
