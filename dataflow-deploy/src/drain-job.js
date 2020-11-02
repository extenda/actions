const exec = require('@actions/exec');

const getJob = async (region, jobName, newJobName, projectId) => {
  let output = '';
  await exec.exec('gcloud', [
    'dataflow',
    'jobs',
    'list',
    `--region=${region}`,
    `--filter='NAME:${jobName}* AND NOT NAME:${newJobName} AND STATE=Running'`,
    'format=\'value(JOB_ID)\'',
    `--project=${projectId}`,
  ], {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output;
};

const drainJob = async (
  jobName, newJobName, region, projectId,
) => exec.exec('gcloud', [
  'dataflow',
  'jobs',
  'drain',
  await getJob(region, jobName, newJobName, projectId),
  `--region=${region}`,
  `--project=${projectId}`,
]);

module.exports = drainJob;
