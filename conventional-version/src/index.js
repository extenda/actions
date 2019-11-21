const core = require('@actions/core');
const versions = require('../../utils/src/versions');

const run = async () => {
  try {
    const tagPrefix = core.getInput('tag-prefix', { required: true });
    const versionSuffix = core.getInput('version-suffix');

    versions.tagPrefix = tagPrefix;
    const version = await versions.getBuildVersion(versionSuffix);

    core.info(`Project version: ${version}`);
    core.setOutput('version', version);
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
