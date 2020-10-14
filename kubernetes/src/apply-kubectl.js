const exec = require('@actions/exec');

const applyKubectl = async (deployment, deploymentType, dryRun = false) => {
  const applyArgs = [
    'apply',
    '-k',
    './kustomize',
  ];
  if (dryRun) {
    applyArgs.push('--dry-run=client');
  }

  await exec.exec('kubectl', applyArgs);

  if (!dryRun) {
    await exec.exec('kubectl', [
      'rollout',
      'status',
      deploymentType,
      deployment,
      `--namespace=${deployment}`,
    ]);
  }
};

module.exports = applyKubectl;
