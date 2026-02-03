import * as core from '@actions/core';

import loadServiceDefinition from '../../cloud-run/src/service-definition.js';
import { failIfNotTrunkBased, run } from '../../utils/src/index.js';
import kubernetesSchema from './kubernetes-schema.js';
import runDeploy from './run-deploy.js';

const action = async () => {
  // Get params from action input
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const serviceFile = core.getInput('service-definition') || 'kubernetes.yaml';
  const image = core.getInput('image', { required: true });
  const dryRun = core.getInput('dry-run') === 'true';

  failIfNotTrunkBased();

  // Uses function from cloud-run action src to retrieve service definition from yaml file
  const service = loadServiceDefinition(serviceFile, kubernetesSchema);

  // Execute functions needed to deploy the application
  await runDeploy(serviceAccountKey, service, image, dryRun);
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
