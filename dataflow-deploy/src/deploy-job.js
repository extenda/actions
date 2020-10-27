const exec = require('@actions/exec');

const deployJob = async (
  newJobName, parameters, dataflowServiceAccount, bucket, region, projectId,
) => exec.exec('gcloud', [
  'dataflow',
  'flex-template',
  'run',
  newJobName,
  `--template-file-gcs-location=${bucket}/template.json`,
  `--parameters=${parameters}`,
  `--service-account-email=${dataflowServiceAccount}`,
  `--staging-location=${bucket}}/temp`,
  `--region=${region}`,
  `--project=${projectId}`,
]);

module.exports = deployJob;
