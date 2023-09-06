const yaml = require('js-yaml');

const addNamespace = async (content, namespace) => {
  const json = yaml.load(content);
  json.metadata.namespace = namespace;
  return yaml.dump(json);
};

module.exports = { addNamespace };
