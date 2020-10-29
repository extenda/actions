const exec = require('@actions/exec');

// Dataflow build gcloud cmd
const dataflowBuild = async (templatePath, image, sdkLanguage, metadataPath) => {
  const args = [
    'dataflow',
    'flex-template',
    'build',
    templatePath,
    `--image=${image}`,
    `--sdk-language=${sdkLanguage}`,
  ];
  if (metadataPath !== '') {
    args.push(`--metadata-file=${metadataPath}`);
  }
  return exec.exec('gcloud', args);
};

module.exports = dataflowBuild;
