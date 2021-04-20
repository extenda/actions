const exec = require('@actions/exec');

const generateFolders = async (cloudrunServiceName) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  await exec.exec('mkdir', [
    '-pv',
    `${cloudrunServiceName}/${year}_${month}/deployments/`,
  ]).then(() => exec.exec('touch', [
    `${cloudrunServiceName}/${year}_${month}/deployments/${day}_${hour}:${minute}:${second}`,
  ]));
};

const generateDeployLog = async (cloudrunServiceName) => generateFolders(cloudrunServiceName)
  .then(() => exec.exec('gsutil', [
    'cp',
    '-r',
    cloudrunServiceName,
    'gs://dora-metrics',
  ]));

module.exports = generateDeployLog;
