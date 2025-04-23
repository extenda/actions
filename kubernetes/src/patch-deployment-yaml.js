const yaml = require('yaml');

/**
 * Patches deployment specification with values provided in service definition.
 * @returns Patched deployment specification yaml in string format.
 */
const patchDeploymentYaml = (service, deploymentYaml) => {
  const deployment = yaml.parse(deploymentYaml);

  const { requests, limits, replicas = 1 } = service;

  deployment.spec.replicas = replicas;

  if (requests) {
    deployment.spec.template.spec.containers[0].resources.requests.cpu =
      requests.cpu;
    deployment.spec.template.spec.containers[0].resources.requests.memory =
      requests.memory;
  }

  if (limits) {
    deployment.spec.template.spec.containers[0].resources.limits.cpu =
      limits.cpu;
    deployment.spec.template.spec.containers[0].resources.limits.memory =
      limits.memory;
  }

  return yaml.stringify(deployment);
};

module.exports = patchDeploymentYaml;
