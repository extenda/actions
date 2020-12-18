const yaml = require('yaml');

const patchDeploymentYaml = (service, deploymentYaml) => {
  const deployment = yaml.parse(deploymentYaml);

  deployment.spec.replicas = service.replicas;

  if (service.requests) {
    deployment.spec.template.spec.containers[0].resources.requests.cpu = service.requests.cpu;
    deployment.spec.template.spec.containers[0].resources.requests.memory = service.requests.memory;
  }

  if (service.limits) {
    deployment.spec.template.spec.containers[0].resources.limits.cpu = service.limits.cpu;
    deployment.spec.template.spec.containers[0].resources.limits.memory = service.limits.memory;
  }

  return yaml.stringify(deployment);
};

module.exports = patchDeploymentYaml;
