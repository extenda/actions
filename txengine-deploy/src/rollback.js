const core = require('@actions/core');
const gcloudOutput = require('./gcloud-output');

const parseStatus = async (statuses) => {
  for (const status of statuses) {
    if (status.status !== 'True') {
      return false;
    }
  }
  return true;
};

const killPod = async (podName, status, namespace) => {
  if (!status) {
    core.info(`failing pod detected, deleting ${podName}...`);
    return gcloudOutput([
      'delete',
      'pod',
      podName,
      '-n',
      namespace,
    ], 'kubectl');
  }
  return null;
};

const checkStatusAndKillFailingPods = async (namespace) => {
  const serviceList = JSON.parse(await gcloudOutput([
    'get',
    'pod',
    '-n',
    namespace,
    '-o',
    'json',
  ], 'kubectl')).items;

  const promises = [];
  for (const service of serviceList) {
    const podName = service.spec.hostname;
    promises.push(parseStatus(service.status.conditions)
      .then((status) => killPod(podName, status, namespace)));
  }
  return Promise.resolve(promises);
};

module.exports = checkStatusAndKillFailingPods;
