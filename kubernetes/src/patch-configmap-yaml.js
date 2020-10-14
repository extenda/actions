const yaml = require('yaml');

const patchConfigMapYaml = (environmentArgs, configMapYaml) => {
  const configMap = yaml.parse(configMapYaml);

  configMap.data = { ...environmentArgs };

  return yaml.stringify(configMap);
};

module.exports = patchConfigMapYaml;
