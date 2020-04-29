const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const yaml = require('yaml');

const getPackagePath = async(regoFile) => {
  // get package line and retrieve the path
  return '' + (`${regoFile}`).split('\n', 1)[0].replace('package', '').trim();
};

const setupRegoAndApply = async (namespace, regoFile) => {
  let rego = (`${regoFile}`).replace(/\r\n/g, "\n");
  let policyConfig = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'opa-policy',
      namespace: namespace
    },
    data: {
      'policy.rego': rego
    }
  };
  let yamlStr = yaml.stringify(policyConfig);
  fs.writeFileSync('policy.yaml', yamlStr, 'utf8');
  await exec.exec('kubectl', [
    'apply',
    '-f',
    'policy.yaml',
  ])
};

const setupOpaConfigAndApply = async (namespace, regoPackage) => {
  let configYaml = yaml.stringify({
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
  let opaConfig = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'opa-istio-config',
      namespace: namespace
    },
    data: {
      'config.yaml': configYaml
    }
  };
  let yamlStr = yaml.stringify(opaConfig);
  fs.writeFileSync('config.yaml', yamlStr, 'utf8');
  await exec.exec('kubectl', [
    'apply',
    '-f',
    'config.yaml',
  ])
};

const setOpaConfigurations = async (namespace, regoFile) => {
  await setupOpaConfigAndApply(namespace, await getPackagePath(regoFile));
  await setupRegoAndApply(namespace, regoFile);
};

module.exports = {
  setOpaConfigurations,
};
