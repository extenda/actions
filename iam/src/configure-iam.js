const core = require('@actions/core');
const request = require('request');
const { setupPermissions, handlePermissions } = require('./permissions');
const { setupRoles } = require('./roles');
const { setupSystem } = require('./create-system');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const createNamespace = require('../../cloud-run/src/create-namespace');
const checkOwners = require('./handle-owners');
const checkRepository = require('./handle-repository');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');

const checkSystem = async (
  systemName, styraToken, styraUrl,
) => new Promise((resolve) => {
  const url = `${styraUrl}/v1/systems?compact=false&name=${systemName}`;
  request({
    uri: url,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${styraToken}`,
    },
  }, (error, res, body) => {
    if (!error) {
      const jsonBody = JSON.parse(body);
      jsonBody.result.forEach((result) => {
        if (result.name === `${systemName}`) {
          resolve(result);
        }
      });
      resolve({ id: '' });
    }
  });
});

const configureIAM = async (
  iam, styraToken, styraUrl, iamUrl, iamToken, env, projectId, systemOwners, skipIAM,
) => {
  const {
    'permission-prefix': permissionPrefix,
    services,
    permissions,
    roles,
  } = iam;


  const promises = [];
  const cluster = await getClusterInfo(projectId);
  await authenticateKubeCtl(cluster);

  services.forEach(({ name: namespace, repository }) => {
    const systemName = `${permissionPrefix}.${namespace}-${env}`;

    // 1. Authenticate Kubectl and create namespace (if not exists)
    // 2. Check if DAS system exists
    // 3. Create DAS system (if not exists)
    promises.push(checkSystem(systemName, styraToken, styraUrl)
      .then((system) => {
        if (system.id === '') {
          core.info(`creating system '${systemName}' in ${styraUrl}`);
          return createNamespace(projectId, true, namespace)
            .then(() => setupSystem(
              namespace, systemName, env, repository, styraToken, styraUrl, systemOwners,
            ));
        }
        core.info(`system '${systemName}' already exists in ${styraUrl}`);
        return checkOwners(system.id, styraToken, styraUrl, systemOwners)
          .then(() => checkRepository(system, styraToken, styraUrl, repository));
      }));
  });

  // Wait for K8s and DAS system.
  await Promise.all(promises);

  // Next, update IAM system
  if (!skipIAM) {
    return setupPermissions(permissions, permissionPrefix)
      .then((fullPermissions) => handlePermissions(fullPermissions, iamToken, iamUrl))
      .then(() => setupRoles(roles, permissionPrefix, iamToken, iamUrl));
  }
  return null;
};

module.exports = configureIAM;
