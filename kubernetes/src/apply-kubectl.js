const exec = require('@actions/exec');

/**
Applies the existing kustomize from ./kustomize folder.
If not dry-run then triggers a rolling update for the service.
Watches the rollout status until it's done.
*/
const applyKubectl = async (deploymentName, deploymentType, dryRun = false) => {
  // Form additional argument for the kubectl command
  const applyArgs = [
    'apply',
    '-k',
    './kustomize',
  ];
  if (dryRun) {
    applyArgs.push('--dry-run=client');
  }

  // Apply changes and trigger rolling update
  await exec.exec('kubectl', applyArgs);

  if (!dryRun) {
    await exec.exec('kubectl', [
      'rollout',
      'status',
      deploymentType,
      deploymentName,
      `--namespace=${deploymentName}`,
      '--watch=true',
    ]);
  }
};

module.exports = applyKubectl;
