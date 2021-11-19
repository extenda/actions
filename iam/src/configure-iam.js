const core = require('@actions/core');
const request = require('request');
const { setupPermissions, handlePermissions } = require('./permissions');
const { setupRoles } = require('./roles');
const { setupSystem, buildOpaConfig, applyConfiguration } = require('./create-system');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const createNamespace = require('../../cloud-run/src/create-namespace');
const checkOwners = require('./handle-owners');
const checkRepository = require('./handle-repository');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');
const handleConsumers = require('./handle-consumers');
const gcloudOutput = require('../../txengine-deploy/src/gcloud-output');

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

const checkNamespace = async (
  namespace,
) => {
  const opaConfigStatus = await gcloudOutput(
    'get',
    'cm',
    'opa-envoy-config',
    `--namespace=${namespace}`,
    'kubectl',
  );
  if (opaConfigStatus.includes('(NotFound):')) {
    return false;
  }
  return true;
};

const updateMiscelaneous = async (
  systemName, styraUrl, system, styraToken, systemOwners, repository, consumers,
) => {
  core.info(`system '${systemName}' already exists in ${styraUrl}, running updates!`);
  return checkOwners(system.id, styraToken, styraUrl, systemOwners)
    .then(() => checkRepository(system, styraToken, styraUrl, repository)
      .then(() => handleConsumers(system.id, styraToken, styraUrl, consumers, systemName)));
};

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

  services.forEach(({
    name: namespace, repository, 'allowed-consumers': consumers, 'styra-name': styraName,
  }) => {
    const systemName = styraName ? `${permissionPrefix}.${styraName}-${env}` : `${permissionPrefix}.${namespace}-${env}`;

    // 1. Check if DAS system exists
    // If system doesn't exist
    //   2. Create namespace
    //   3. Create DAS system
    // If shared system
    //  2. Configure namespace
    // If system exists
    //   2. Update owners
    //   3. Update repository reference
    //   4. Update consumers
    promises.push(checkSystem(systemName, styraToken, styraUrl)
      .then((system) => {
        if (system.id === '') {
          core.info(`creating system '${systemName}' in ${styraUrl}`);
          return createNamespace(projectId, true, namespace)
            .then(() => setupSystem(
              namespace, systemName, env, repository, styraToken, styraUrl, systemOwners, consumers,
            )).catch((err) => errors.push(err));
        }

        if (styraName) {
          // Check if service is configured
          return checkNamespace(namespace).then((exists) => {
            if (!exists) {
              return createNamespace(projectId, true, namespace)
                .then(() => buildOpaConfig(system.id, styraToken, namespace, styraUrl)
                  .then((opaConfig) => applyConfiguration(opaConfig, systemName)
                    .then(() => core.info(`opa successfully setup for ${namespace}`))));
            }
            return updateMiscelaneous(
              systemName, styraUrl, system, styraToken, systemOwners, repository, consumers,
            );
          }).catch((err) => errors.push(err));
        }
        return updateMiscelaneous(
          systemName, styraUrl, system, styraToken, systemOwners, repository, consumers,
        );
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
