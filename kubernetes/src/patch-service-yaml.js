import yaml from 'yaml';

/**
 * Patches service specification with properties from provided service definition.
 * @returns Patched service specification yaml in string format.
 */
const patchServiceYaml = (serviceDefinition, serviceYaml) => {
  const patchedService = yaml.parse(serviceYaml);

  if (serviceDefinition.ports && serviceDefinition.ports.length) {
    patchedService.spec.ports = serviceDefinition.ports;

    // remove clusterIp:NONE from template
    delete patchedService.spec.clusterIP;
  }

  return yaml.stringify(patchedService);
};

export default patchServiceYaml;
