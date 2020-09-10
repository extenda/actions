const core = require('@actions/core');
const request = require('request');
const { setupPermissions, handlePermissions } = require('./permissions');
const { setupRoles } = require('./roles');
const setupSystem = require('./create-system');
const getClusterInfo = require('../../cloud-run/src/cluster-info');
const authenticateKubectl = require('../../cloud-run/src/kubectl-auth');

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
  iam, styraToken, styraUrl, iamUrl, iamToken, env, projectId,
) => {
  const {
    'permission-prefix': permissionPrefix,
    systems,
    permissions,
    roles,
  } = iam;


  const promises = [];
  const cluster = await getClusterInfo(projectId, undefined);
  await authenticateKubectl(cluster);

  Object.keys(systems).forEach(async (key) => {
    const { namespace } = systems[key];
    const { repository } = systems[key];
    const systemName = `${permissionPrefix}.${namespace}-${env}`;
    promises.push(checkSystem(systemName, styraToken, styraUrl)
      .then((createSystem) => {
        if (createSystem) {
          core.info(`creating system ${systemName}`);
          return setupSystem(namespace, systemName, env, repository, styraToken, styraUrl);
        }
        return null;
      }));
  });

  promises.push(setupPermissions(permissions, permissionPrefix)
    .then((fullPermissions) => handlePermissions(fullPermissions, iamToken, iamUrl))
    .then(() => setupRoles(roles, permissionPrefix, iamToken, iamUrl)));

  return Promise.all(promises);
};

module.exports = configureIAM;
