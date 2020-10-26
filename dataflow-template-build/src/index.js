const core = require('@actions/core');
const dataflowBuild = require('./dataflow-build');
const { run } = require('../../utils');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const image = core.getInput('image', { required: true });
  const metadataPath = core.getInput('metadata-path', { required: true });
  const sdkLanguage = core.getInput('sdk-language') || 'JAVA';
  const templatePath = core.getInput('template-path', { required: true });

  await setupGcloud(serviceAccountKey, process.env.GCLOUD_INSTALLED_VERSION || 'latest');
  await dataflowBuild(templatePath, image, sdkLanguage, metadataPath);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
