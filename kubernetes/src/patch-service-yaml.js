const yaml = require('yaml');

const patchServiceYaml = (service, serviceYaml) => {
  const patchedService = yaml.parse(serviceYaml);

  if (service.ports && service.ports.length) {
    patchedService.spec.ports = service.ports;
    // remove clusterIp:NONE from template
    delete patchedService.spec.clusterIP;
  }

  return yaml.stringify(patchedService);
};

module.exports = patchServiceYaml;
