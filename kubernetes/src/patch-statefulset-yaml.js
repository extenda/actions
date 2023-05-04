const yaml = require('yaml');

/**
 * Patches statefulset specification with values provided in service definition.
 * @returns Patched statefulset specification yaml in string format.
 */
const patchStatefulSetYaml = (serviceDefinition, statefulsetYaml) => {
  const statefulSet = yaml.parse(statefulsetYaml);

  // Extracts only needed data from service definition
  const {
    requests,
    limits,
    replicas = 1,
    storage: {
      volume = '1Gi',
      mountPath = '/data/storage',
      storageClassName,
    },
  } = serviceDefinition;

  // Set replica count to the one in the definition
  statefulSet.spec.replicas = replicas;

  // Set storage parameters to the ones from definition
  statefulSet.spec.template.spec.containers[0].volumeMounts[0].mountPath = mountPath;
  statefulSet.spec.volumeClaimTemplates[0].spec.resources.requests.storage = volume;

  if (storageClassName) {
    statefulSet.spec.volumeClaimTemplates[0].spec.storageClassName = storageClassName;
  }

  // Default parameters in template are set to:
  // requests:
  //   cpu: 100m
  //   memory: 256Mi
  // limits:
  //   cpu: 100m
  //   memory: 256Mi
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
