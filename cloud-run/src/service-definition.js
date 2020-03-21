const fs = require('fs');
const yaml = require('yaml');

const loadFile = (serviceFile) => {
  if (!fs.existsSync(serviceFile)) {
    throw Error(`Service specification file not found: ${serviceFile}`);
  }
  return yaml.parse(fs.readFileSync(serviceFile, 'utf8'));
};

const requireProperty = (spec, name, fqn = '') => {
  if (spec[name] === undefined || spec[name] === null) {
    throw new Error(`Missing required property: ${fqn || name}`);
  }
};

const validate = (spec) => {
  requireProperty(spec, 'name');
  requireProperty(spec, 'memory');
  requireProperty(spec, 'allow-unauthenticated');
  requireProperty(spec, 'runs-on');

  const { 'runs-on': runsOn } = spec;
  if ((!runsOn.managed && !runsOn.gke) || (runsOn.managed && runsOn.gke)) {
    throw new Error('Invalid runs-on block, must contain either managed or gke property');
  }

  if (runsOn.managed) {
    const { managed } = runsOn;
    requireProperty(managed, 'region', 'runs-on.managed.region');
  }

  if (runsOn.gke) {
    const { gke } = runsOn;
    requireProperty(gke, 'cluster', 'runs-on.gke.cluster');
    requireProperty(gke, 'cluster-location', 'runs-on.gke.cluster-location');
  }
};

const convert = (spec) => {
  const {
    name,
    memory,
    'allow-unauthenticated': allowUnauthenticated,
    'runs-on': runsOn,
  } = spec;

  const model = {
    name,
    memory,
    allowUnauthenticated,
  };

  if (runsOn.managed) {
    model.runsOn = {
      platform: 'managed',
      region: runsOn.managed.region,
    };
  } else {
    model.runsOn = {
      platform: 'gke',
      cluster: runsOn.gke.cluster,
      clusterLocation: runsOn.gke['cluster-location'],
    };
  }
  return model;
};

const loadServiceDefinition = (serviceFile) => {
  const spec = loadFile(serviceFile);
  validate(spec);
  return convert(spec);
};

module.exports = loadServiceDefinition;
