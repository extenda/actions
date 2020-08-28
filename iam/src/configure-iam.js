const exec = require('@actions/exec');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const projectInfo = require('../../cloud-run/src/project-info');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const checkSystem = (systemName, env, styra_token) => {
  return new Promise((resolve, reject) => {
    request.get(`https://extendaretail.styra.com/v1/systems?compact=true&name=${systemName}-${env}`, {
      'auth': {
        'bearer': styra_token
      }
    },
      (error, res, body) => {
        if (!error) {
          jsonBody = JSON.parse(body);
          jsonBody.result.forEach((result) => {
            if (result.name === `${systemName}-${env}`) {
              resolve(true);
            }
          });
          reject(`No system found with name: ${systemName}-${env}`)
        }
      });
  })
}

const listExistingPermissions = (systemName, env) => {
  if (env === 'staging') {
    url = 'https://iam-api.retailsvc.dev/api/v1/permissions';
  } else {
    url = 'https://iam-api.retailsvc.com/api/v1/permissions';
  }

  return new Promise((resolve, reject) => {
    request.get(url, {
      'auth': {
        'bearer': ''
      }
    },
      (error, res, body) => {
        if (!error) {
          jsonBody = JSON.parse(body);
          resolve(body);
        }
      });
  })
}

const setupPermissions = (permissions, system_id) => {
  full_permission = new Set();
  for (var permission in permissions) {
    for (var key in permissions[permission]) {
      var permission_id = `${system_id}.${permission}.${key}`;
      var permission_desc = permissions[permission][key];
      full_permission.add({ permission_id, permission_desc })
    }
  }
  return full_permission;
};

const handlePermissions = (permissions) => {

}

const configureIAM = async (serviceAccountKey, iam, styra_token) => {
  const projectId = await gcloudAuth(serviceAccountKey);

  const {
    project,
    env,
  } = projectInfo(projectId);

  const {
    system,
    permissions,
    roles,
  } = iam;

  await checkSystem(system.id, env, styra_token).catch((error) => {
    console.error(error)
    process.exit(1);
  });

  full_permissions = await setupPermissions(permissions, system.id);
  handlePermissions(full_permissions);

}

module.exports = configureIAM;
