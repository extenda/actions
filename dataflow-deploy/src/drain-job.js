const exec = require('@actions/exec');

const getJobs = async (region, jobName, newJobId, projectId) => {
  let output = '';
  await exec.exec(
    'gcloud',
    [
      'dataflow',
      'jobs',
      'list',
      `--filter=NAME:${jobName}* AND NOT ID:${newJobId} AND STATE=Running`,
      '--format=value(JOB_ID)',
      `--region=${region}`,
      `--project=${projectId}`,
    ],
    {
      silent: false,
      listeners: {
        stdout: (data) => {
          output += data.toString('utf8');
        },
      },
    },
  );
  return output.trim().split(/[\r\n]+/);
};

const drainJob = async (newJobId, jobName, region, projectId) => {
  const jobs = await getJobs(region, jobName, newJobId, projectId);
  if (jobs[0] === '') {
    return true;
  }
  const drainJobs = [];
  jobs.forEach((jobId) => {
    drainJobs.push(
      exec.exec('gcloud', [
        'dataflow',
        'jobs',
        'drain',
        jobId,
        `--region=${region}`,
        `--project=${projectId}`,
      ]),
    );
  });
  return Promise.all(drainJobs);
};

module.exports = drainJob;
