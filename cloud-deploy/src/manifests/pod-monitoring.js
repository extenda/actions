import * as core from '@actions/core';

import execGcloud from '../utils/gcloud-output.js';

const deletePodMonitor = async (name) =>
  execGcloud(
    ['delete', 'podmonitorings', `--namespace=${name}`, name],
    'kubectl',
    true,
    true,
  )
    .then(() => core.info('Deleted old pod monitoring resource'))
    .catch(() => true); // succeed even if resource does not exist

const podMonitorManifest = (name, monitoring, opa) => {
  const { prometheus: { interval = -1, path = '/metrics', port = 8080 } = {} } =
    monitoring;
  const endpoints = [];
  if (interval > 0) {
    endpoints.push({
      port,
      path,
      interval: `${interval}s`,
    });
  }
  if (opa) {
    endpoints.push({
      port: 9001,
      interval: '60s',
      path: '/metrics',
    });
  }
  if (endpoints.length === 0) {
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
      endpoints,
    },
  };
};

export { deletePodMonitor, podMonitorManifest };
