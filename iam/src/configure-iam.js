const core = require('@actions/core');
const request = require('request');
const { setupPermissions, handlePermissions } = require('./permissions');
const { setupRoles } = require('./roles');
const setupSystem = require('./create-system');
const getClusterInfo = require('../../cloud-run/src/cluster-info');
const createNamespace = require('../../cloud-run/src/create-namespace');

const checkSystem = async (
  systemName, styraToken, styraUrl,
) => new Promise((resolve) => {
  const url = `${styraUrl}/v1/systems?compact=true&name=${systemName}`;
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
          resolve(false);
        }
      });
      resolve(true);
    }
  });
});

const configureIAM = async (
  iam, styraToken, styraUrl, iamUrl, iamToken, env, projectId, systemOwners,
) => {
  const {
    'permission-prefix': permissionPrefix,
    services,
    permissions,
    roles,
  } = iam;


  const promises = [];
  const cluster = await getClusterInfo(projectId);

  services.forEach(({ name: namespace, repository }) => {
    const systemName = `${permissionPrefix}.${namespace}-${env}`;

    // 1. Authenticate Kubectl and create namespace (if not exists)
    // 2. Check if DAS system exists
    // 3. Create DAS system (if not exists)
    promises.push(createNamespace(projectId, true, cluster, namespace)
      .then(() => checkSystem(systemName, styraToken, styraUrl)
        .then((createSystem) => {
          if (createSystem) {
            core.info(`creating system '${systemName}' in ${styraUrl}`);
            return setupSystem(
              namespace, systemName, env, repository, styraToken, styraUrl, systemOwners,
            );
          }
          core.info(`system '${systemName}' already exists in ${styraUrl}`);
          return null;
        })));
  });

  // Wait for K8s and DAS system.
  await Promise.all(promises);

  // Next, update IAM system
  return setupPermissions(permissions, permissionPrefix)
    .then((fullPermissions) => handlePermissions(fullPermissions, iamToken, iamUrl))
    .then(() => setupRoles(roles, permissionPrefix, iamToken, iamUrl));
};

module.exports = configureIAM;
