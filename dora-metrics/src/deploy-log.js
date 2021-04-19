const exec = require('@actions/exec');
const core = require('@actions/core');

const generateFolders = async (cloudrunServiceName, type = 'deployments', date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return exec.exec('mkdir', [
    '-pv',
    `${cloudrunServiceName}/${year}_${month}/${type}/`,
  ]).then(() => exec.exec('touch', [
    `${cloudrunServiceName}/${year}_${month}/${type}/${day}_${hour}:${minute}:${second}`,
  ]));
};

const uploadToBucket = async (cloudrunServiceName) => exec.exec('gsutil', [
  'cp',
  '-r',
  cloudrunServiceName,
  'gs://dora-metrics',
]).catch((err) => core.info(`upload to bucket failed reason: ${err}`));

module.exports = { generateFolders, uploadToBucket };
