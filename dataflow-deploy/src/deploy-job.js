const exec = require('@actions/exec');

const deployJob = async (
  newJobName,
  parameters,
  dataflowServiceAccount,
  templatePath,
  region,
  projectId,
  mode,
  stagingLocation,
) => {
  const args = [
    'dataflow',
    mode,
    'run',
    newJobName,
  ];
  if (mode === 'flex-template') {
    args.push(`--template-file-gcs-location=${templatePath}`);
  } else {
    args.push(`--gcs-location=${templatePath}`);
  }
  if (parameters !== '') {
    args.push(`--parameters=${parameters}`);
  }
  if (stagingLocation) {
    args.push(`--staging-location=${stagingLocation}`);
  }
  args.push(`--service-account-email=${dataflowServiceAccount}`);
  args.push(`--region=${region}`);
  args.push(`--project=${projectId}`);

  return exec.exec('gcloud', args);
};

module.exports = deployJob;
