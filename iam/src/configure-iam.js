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
const handleConsumers = require('./handle-consumers');

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


  const errors = [];
  const promises = [];
  const cluster = await getClusterInfo(projectId);
  // Connect to cluster
  await authenticateKubeCtl(cluster);

  services.forEach(({ name: namespace, repository, 'allowed-consumers': consumers }) => {
    const systemName = `${permissionPrefix}.${namespace}-${env}`;

    // 1. Check if DAS system exists
    // If system doesn't exist
    //    2. Create namespace
    //    3. Create DAS system
    // If system exists
    //    2. Update owners
    //    3. Update repository reference
    promises.push(checkSystem(systemName, styraToken, styraUrl)
      .then((system) => {
        if (system.id === '') {
          core.info(`creating system '${systemName}' in ${styraUrl}`);
          return createNamespace(projectId, true, namespace)
            .then(() => setupSystem(
              namespace,
              systemName,
              env,
              repository,
              styraToken,
              styraUrl,
              systemOwners,
              consumers,
              iamToken,
              iamUrl,
            )).catch((err) => errors.push(err));
        }
        core.info(`system '${systemName}' already exists in ${styraUrl}`);
        return checkOwners(system.id, styraToken, styraUrl, systemOwners)
          .then(() => checkRepository(system, styraToken, styraUrl, repository)
            .then(() => handleConsumers(
              system.id,
              styraToken,
              styraUrl,
              consumers,
              systemName,
              iamToken,
              iamUrl,
            )));
      }));
  });

  // Wait for K8s and DAS system.
  await Promise.all(promises);

  // Next, update IAM system
  if (!skipIAM) {
    try {
      const fullPermissions = await setupPermissions(permissions, permissionPrefix);
      await handlePermissions(fullPermissions, iamToken, iamUrl);
      await setupRoles(roles, permissionPrefix, iamToken, iamUrl, fullPermissions);
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      core.error(error);
    }
    throw new Error('Errors occurred. Fix issues and rerun the action!');
  }

  return null;
};

module.exports = configureIAM;
