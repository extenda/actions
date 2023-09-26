const exec = require('@actions/exec');
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

const createNamespace = async (
  projectId,
  opaEnabled,
  namespace,
  skipNamespace = false,
) => {
  if (skipNamespace) {
    return;
  }
  if (!await getNamespace(namespace)) {
    throw new Error(`Namespace not found, please make sure your service is setup correctly!
Visit https://github.com/extenda/tf-infra-gcp/blob/master/docs/project-config.md#services for more information`);
  }

  if (opaEnabled !== 'skip') {
    await setOpaInjectionLabels(namespace, opaEnabled);
  }
};

module.exports = createNamespace;
