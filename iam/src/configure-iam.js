const core = require('@actions/core');
const { setupPermissions, handlePermissions } = require('./permissions');
const { setupRoles } = require('./roles');
const { setupSystem } = require('./create-system');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const createNamespace = require('../../cloud-run/src/create-namespace');
const checkOwners = require('./handle-owners');
const checkRepository = require('./handle-repository');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');
const handleConsumers = require('./handle-consumers');
const checkSystem = require('./check-system');

const configureIAM = async (
  iam,
  styraToken,
  styraUrl,
  iamUrl,
  iamToken,
  env,
  projectId,
  systemOwners,
  skipIAM,
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

  if (services) {
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
              .then(() => handleConsumers(system.id, styraToken, styraUrl, consumers, systemName)));
        }));
    });
  }

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

module.exports = {
  configureIAM,
  checkSystem,
};
