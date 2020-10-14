const yaml = require('yaml');

const patchStatefulSetYaml = (service, containerYaml) => {
  const statefulSet = yaml.parse(containerYaml);

  const {
    replicas = 1,
    cpu = '100m',
    memory = '256Mi',
    storage: {
      volume = '1Gi',
      mountPath = '/data/storage',
    },
  } = service;

  statefulSet.spec.replicas = replicas;
  statefulSet.spec.template.spec.containers[0].resources.requests.cpu = cpu;
  statefulSet.spec.template.spec.containers[0].resources.limits.cpu = cpu;
  statefulSet.spec.template.spec.containers[0].resources.requests.memory = memory;
  statefulSet.spec.template.spec.containers[0].resources.limits.memory = memory;
  statefulSet.spec.template.spec.containers[0].volumeMounts[0].mountPath = mountPath;
  statefulSet.spec.volumeClaimTemplates[0].spec.resources.requests.storage = volume;

  return yaml.stringify(statefulSet);
};

module.exports = patchStatefulSetYaml;
