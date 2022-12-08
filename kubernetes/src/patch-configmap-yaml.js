const yaml = require('yaml');

/**
 * Adds environment variables to configmap specification.
 * @param environmentArgs Dictionary of environment variables.
 * @param configMapYaml Configmap specification.
 * @returns Patched configmap specification yaml in string format.
 */
const patchConfigMapYaml = (environmentArgs, configMapYaml) => {
  const configMap = yaml.parse(configMapYaml);

  configMap.data = { ...environmentArgs };

  return yaml.stringify(configMap);
};

module.exports = patchConfigMapYaml;
