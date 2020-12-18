const yaml = require('yaml');

const patchStatefulSetYaml = (service, containerYaml) => {
  const statefulSet = yaml.parse(containerYaml);

  const {
    replicas = 1,
    storage: {
      volume = '1Gi',
      mountPath = '/data/storage',
    },
  } = service;

  statefulSet.spec.replicas = replicas;
  statefulSet.spec.template.spec.containers[0].volumeMounts[0].mountPath = mountPath;
  statefulSet.spec.volumeClaimTemplates[0].spec.resources.requests.storage = volume;

  if (service.requests) {
    statefulSet.spec.template.spec.containers[0].resources.requests.cpu = service.requests.cpu;
    statefulSet.spec.template.spec.containers[0].resources.requests.memory = service.requests.memory;
  }

  if (service.limits) {
    statefulSet.spec.template.spec.containers[0].resources.limits.cpu = service.limits.cpu;
    statefulSet.spec.template.spec.containers[0].resources.limits.memory = service.limits.memory;
  }

  return yaml.stringify(statefulSet);
};

module.exports = patchStatefulSetYaml;
