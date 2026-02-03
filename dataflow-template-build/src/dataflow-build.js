import * as exec from '@actions/exec';

// Dataflow build gcloud cmd
const dataflowBuild = async (
  templatePath,
  image,
  sdkLanguage,
  metadataPath,
  jarPath,
  envVars,
) => {
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
  if (jarPath !== '') {
    args.push(`--jar=${jarPath}`);
  }
  if (envVars !== '') {
    args.push(`--env=${envVars}`);
  }
  return exec.exec('gcloud', args);
};

export default dataflowBuild;
