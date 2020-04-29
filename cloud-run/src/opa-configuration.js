const exec = require('@actions/exec');
const fs = require('fs');
const yaml = require('yaml');

// get package line and retrieve the path
const getPackagePath = async (regoFile) => regoFile.split('\n', 1)[0].replace('package', '').trim();

const setupRegoAndApply = async (namespace, rego) => {
  const policyConfig = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'opa-policy',
      namespace,
    },
    data: {
      'policy.rego': rego,
    },
  };
  const yamlStr = yaml.stringify(policyConfig);
  fs.writeFileSync('policy.yaml', yamlStr, 'utf8');

  return exec.exec('kubectl', [
    'apply',
    '-f',
    'policy.yaml',
  ]);
};

const setupOpaConfigAndApply = async (namespace, regoPackage) => {
  const configYaml = yaml.stringify({
    bundles: {
      global_policy: {
        service: 'global_bundle',
        resource: `${namespace}.tar.gz`,
        polling: {
          min_delay_seconds: 10,
          max_delay_seconds: 20,
        },
      },
    },
    services: {
      name: 'global_bundle',
      url: 'http://bundle-server.opa-bundle.svc.cluster.local',
    },
    decision_logs: {
      console: 'true',
    },
    plugins: {
      envoy_ext_authz_grpc: {
        addr: ':9191',
        path: `${regoPackage}.allow`.replace('.', '/'),
      },
    },
  });
  const opaConfig = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'opa-istio-config',
      namespace,
    },
    data: {
      'config.yaml': configYaml,
    },
  };
  const yamlStr = yaml.stringify(opaConfig);
  fs.writeFileSync('config.yaml', yamlStr, 'utf8');
  await exec.exec('kubectl', [
    'apply',
    '-f',
    'config.yaml',
  ]);
};

const loadRego = (regoFile) => fs.readFileSync(regoFile).replace(/\r\n/g, '\n');

const setOpaConfigurations = async (namespace, regoFile) => {
  const rego = loadRego(regoFile);
  const regoPackage = await getPackagePath(rego);
  await setupOpaConfigAndApply(namespace, regoPackage);
  await setupRegoAndApply(namespace, rego);
};

module.exports = {
  setOpaConfigurations,
};
