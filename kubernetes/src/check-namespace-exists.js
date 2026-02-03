import exec from '@actions/exec';

/**
 * @param namespace Namespace name to be searched for.
 * @returns True if namespace exists in GCP. False if namespace is not found.
 */
const getNamespace = async (namespace) => {
  let output = '';
  try {
    await exec.exec('kubectl', ['get', 'namespace', namespace], {
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
    throw new Error(
      `Could not get namespace information! reason: ${err.message || 'unknown'}`,
    );
  }
  return true;
};

/**
 * Checks that namespace is created for the service in gcp.
 * Throws error if it's not there.
 * @param namespace Namespace name to be searched for.
 */
const checkNamespaceExists = async (namespace) => {
  if (!(await getNamespace(namespace))) {
    throw new Error(`Namespace not found, please make sure your service is setup correctly!
Visit https://github.com/extenda/tf-infra-gcp/blob/master/docs/project-config.md#services for more information`);
  }
};

module.exports = checkNamespaceExists;
