const core = require('@actions/core');
const execGcloud = require('../utils/gcloud-output');

const deletePodMonitor = async (namespace) => execGcloud([
  'delete',
  'podmonitorings',
  `--namespace=${namespace}`,
], 'kubectl', true, true)
  .then(() => core.info('Deleted old pod monitoring resource'))
  .catch(() => true); // succeed even if resource does not exist

const podMonitorManifest = (name, monitoring) => {
  const {
    prometheus: {
      interval = -1,
      path = '/metrics',
    } = {},
  } = monitoring;

  if (interval < 0) {
    return null;
  }

  return {
    apiVersion: 'monitoring.googleapis.com/v1',
    kind: 'PodMonitoring',
    metadata: {
      name,
      namespace: name,
    },
    spec: {
      selector: {
        matchLabels: { app: name },
      },
      endpoints: [{
        port: 8080,
        path,
        interval: `${interval}s`,
      }],
    },
  };
};

module.exports = {
  deletePodMonitor,
  podMonitorManifest,
};
