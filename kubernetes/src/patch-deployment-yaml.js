const yaml = require('yaml');

const patchDeploymentYaml = (service, deploymentYaml) => {
  const deployment = yaml.parse(deploymentYaml);

  deployment.spec.replicas = service.replicas;
  deployment.spec.template.spec.containers[0].resources.requests.cpu = service.cpu;
  deployment.spec.template.spec.containers[0].resources.limits.cpu = service.cpu;
  deployment.spec.template.spec.containers[0].resources.requests.memory = service.memory;
  deployment.spec.template.spec.containers[0].resources.limits.memory = service.memory;

  return yaml.stringify(deployment);
};

module.exports = patchDeploymentYaml;
