const yaml = require('yaml');

const patchStatefulSetYaml = (service, containerYaml) => {
  const statefulSet = yaml.parse(containerYaml);

  const {
    requests,
    limits,
    replicas = 1,
    storage: {
      volume = '1Gi',
      mountPath = '/data/storage',
    },
  } = service;

  statefulSet.spec.replicas = replicas;
  statefulSet.spec.template.spec.containers[0].volumeMounts[0].mountPath = mountPath;
  statefulSet.spec.volumeClaimTemplates[0].spec.resources.requests.storage = volume;

  if (requests) {
    statefulSet.spec.template.spec.containers[0].resources.requests.cpu = requests.cpu;
    statefulSet.spec.template.spec.containers[0].resources.requests.memory = requests.memory;
  }

  if (limits) {
    statefulSet.spec.template.spec.containers[0].resources.limits.cpu = limits.cpu;
    statefulSet.spec.template.spec.containers[0].resources.limits.memory = limits.memory;
  }

  return yaml.stringify(statefulSet);
};

module.exports = patchStatefulSetYaml;
