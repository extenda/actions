const core = require('@actions/core');
const exec = require('@actions/exec');
const authenticateKubeCtl = require('./kubectl-auth');
const { setOpaConfigurations } = require('./opa-configuration');
const { setOpaInjectionLabels } = require('./set-namespace-label');

const getNamespace = async (namespace) => {
  let output = '';
  try {
    await exec.exec('kubectl', [
      'get',
      'namespace',
      namespace,
    ], {
      listeners: {
        stderr: (data) => {
          output += data.toString('utf8');
        },
      },
    });
  } catch (err) {
    if (output.includes('(NotFound)')) {
      return false;
    }
    throw new Error(`Could not get namespace information! reason: ${err.message || 'unknown'}`);
  }
  return true;
};

const createNamespace = async (clanId,
  opaEnabled,
  { project, cluster, clusterLocation },
  namespace,
  regoFile) => {
  // Authenticate kubectl
  await authenticateKubeCtl({ cluster, clusterLocation, project });

  if (!await getNamespace(namespace)) {
    core.info(`creating namespace ${namespace}`);
    await exec.exec('kubectl', ['create', 'namespace', namespace]);

    await exec.exec('kubectl', [
      'annotate',
      'serviceaccount',
      `--namespace=${namespace}`,
      'default',
      `iam.gke.io/gcp-service-account=${namespace}@${clanId}.iam.gserviceaccount.com`,
    ]);
  }

  await setOpaInjectionLabels(namespace, !regoFile ? false : opaEnabled);

  if (opaEnabled && regoFile) {
    core.info('setting up OPA configurations and rego policy!');
    await setOpaConfigurations(namespace, regoFile);
  }
};

module.exports = createNamespace;
