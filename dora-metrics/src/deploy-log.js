import * as core from '@actions/core';
import * as exec from '@actions/exec';

const generateFolders = async (
  productName,
  type = 'deployments',
  date = new Date(),
) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return exec
    .exec('mkdir', ['-pv', `${productName}/${year}_${month}/${type}/`])
    .then(() =>
      exec.exec('touch', [
        `${productName}/${year}_${month}/${type}/${day}_${hour}:${minute}:${second}`,
      ]),
    );
};

const uploadToBucket = async (productName) =>
  exec
    .exec('gsutil', ['cp', '-r', productName, 'gs://dora-metrics'])
    .catch((err) => {
      core.info(`upload to bucket failed reason: ${err}`);
      throw err;
    });

export { generateFolders, uploadToBucket };
