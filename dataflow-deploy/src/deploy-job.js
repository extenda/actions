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
  network,
  subnetwork,
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
  args.push(`--network=${network}`);
  args.push(`--subnetwork=${subnetwork}`);

  let jobId = '';
  await exec.exec('gcloud', args, {
    silent: false,
    listeners: {
      stdout: (data) => {
        jobId += data.toString('utf8');
      },
    },
  });

  if (mode === 'flex-template') {
    return jobId.trim().split(/[\r\n]+/)[3].substr(6);
  }
  return jobId.trim().split(/[\r\n]+/)[2].substr(4);
};

module.exports = deployJob;
