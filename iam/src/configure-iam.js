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

const checkSystem = async (systemName, styraToken, styraUrl) => new Promise((resolve) => {
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
) => gcloudOutput([
  'get',
  'cm',
  'opa-envoy-config',
  `--namespace=${namespace}`],
'kubectl').then(() => true).catch(() => false);

const updateMiscelaneous = async (
  systemName, styraUrl, system, styraToken, systemOwners, repository, consumers,
) => {
  core.info(`Running updates for system: '${systemName}'`);
  return checkOwners(system.id, styraToken, styraUrl, systemOwners)
    .then(() => checkRepository(system, styraToken, styraUrl, repository)
      .then(() => handleConsumers(system.id, styraToken, styraUrl, consumers, systemName)));
};

const updateNamespaces = async (
  systemInfo, systemOwners, systemName, projectId, system, styraToken, styraUrl, env, errors,
) => {
  let checkedSystem = system;
  const namespacePromises = [];
  if (system.id === '') {
    checkedSystem = await checkSystem(systemName, styraToken, styraUrl);
  }
  for (const namespace of systemInfo.namespace) {
    namespacePromises.push(checkNamespace(namespace)
      .then((exists) => {
        if (!exists) {
          return createNamespace(projectId, true, namespace)
            .then(() => buildOpaConfig(checkedSystem.id, styraToken, namespace, styraUrl)
              .then((opaConfig) => applyConfiguration(opaConfig, `${systemName}-${namespace}`)
                .then(() => core.info(`opa successfully setup for ${namespace} in ${env} environment`))));
        }
        return updateMiscelaneous(
          systemName,
          styraUrl,
          checkedSystem,
          styraToken,
          systemOwners,
          systemInfo.repository,
          systemInfo.consumers,
        );
      }).catch((err) => errors.push(err)));
  }
  return Promise.all(namespacePromises);
};

const updateSharedSystems = async (
  sharedSystems, systemName, namespace, repository, consumers,
) => {
  let serviceInfo = sharedSystems.get(systemName);
  if (!serviceInfo) {
    serviceInfo = {
      namespace: [namespace],
      repository,
      consumers,
    };
    sharedSystems.set(systemName, serviceInfo);
  } else {
    serviceInfo.namespace.push(namespace);
  }
};

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
  const sharedSystems = new Map();
  const cluster = await getClusterInfo(projectId);
  // Connect to cluster
  await authenticateKubeCtl(cluster);

  services.forEach(({
    name: namespace, repository, 'allowed-consumers': consumers, 'styra-name': styraName,
  }) => {
    const systemName = styraName ? `${permissionPrefix}.${styraName}-${env}` : `${permissionPrefix}.${namespace}-${env}`;

    // 1. check if shared system
    // IF shared system
    //    2. Sort services for later handling
    // IF not shared system
    //    2. Check if DAS system exists
    //    If system doesn't exist
    //      3. Create namespace
    //      4. Create DAS system
    //    If system exists
    //      3. Update owners
    //      4. Update repository reference
    //      5. Update consumers
    if (styraName) {
      promises.push(updateSharedSystems(
        sharedSystems, systemName, namespace, repository, consumers,
      ));
    } else {
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
          return updateMiscelaneous(
            systemName, styraUrl, system, styraToken, systemOwners, repository, consumers,
          );
        }));
    }
  });

  // Wait for K8s and DAS system.
  await Promise.all(promises);

  sharedSystems.forEach(async (systemInfo, systemName) => {
    promises.push(checkSystem(systemName, styraToken, styraUrl)
      .then(async (system) => {
        if (system.id === '') {
          const namespace = systemInfo.namespace[0];
          core.info(`creating system '${systemName}' in ${styraUrl}`);
          return createNamespace(projectId, true, namespace)
            .then(() => setupSystem(
              namespace,
              systemName,
              env,
              systemInfo.repository,
              styraToken,
              styraUrl,
              systemOwners,
              systemInfo.consumers,
            )).then(() => updateNamespaces(
              systemInfo,
              systemOwners,
              systemName,
              projectId,
              system,
              styraToken,
              styraUrl,
              env,
              errors,
            )).catch((err) => errors.push(err));
        }
        return updateNamespaces(
          systemInfo,
          systemOwners,
          systemName,
          projectId,
          system,
          styraToken,
          styraUrl,
          env,
          errors,
        );
      }));
  });

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
