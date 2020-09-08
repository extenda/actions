const request = require('request');
const { setupPermissions, handlePermissions } = require('./permissions');
const { setupRoles } = require('./roles');

const checkSystem = async (
  systemName, env, styraToken, styraTenant,
) => new Promise((resolve, reject) => {
  const url = `https://${styraTenant}.styra.com/v1/systems?compact=true&name=${systemName}-${env}`;
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
        if (result.name === `${systemName}-${env}`) {
          resolve(true);
        }
      });
      reject(new Error(`No system found with name: ${systemName}-${env}`));
    }
  });
});

const configureIAM = async (
  iam, styraToken, styraTenant, iamUrl, iamToken, env,
) => {
  const {
    system,
    permissions,
    roles,
  } = iam;

  await checkSystem(system.id, env, styraToken, styraTenant);

  await setupPermissions(permissions, system.id)
    .then((fullPermissions) => handlePermissions(fullPermissions, iamToken, iamUrl));

  await setupRoles(roles, system.id, iamToken, iamUrl);
};

module.exports = configureIAM;
