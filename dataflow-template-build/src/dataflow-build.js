const exec = require('@actions/exec');

// Dataflow build gcloud cmd.
const dataflowBuild = async (templatePath, image, sdkLanguage, metadataPath) => exec.exec('gcloud', [
  'dataflow',
  'flex-template',
  'build',
  templatePath,
  `--image=${image}`,
  `--sdk-language=${sdkLanguage}`,
  `--metadata-file=${metadataPath}`,
]);

module.exports = dataflowBuild;
