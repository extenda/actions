const core = require('@actions/core');
const request = require('request');

const createRole = async (
  iamToken, roleId, roleName, rolePermissions, iamUrl,
) => new Promise((resolve, reject) => {
  const url = `${iamUrl}/api/v1/roles`;
  const roleBody = {
    id: roleId,
    name: roleName,
    permissions: rolePermissions,
  };
  request({
    uri: url,
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${iamToken}`,
    },
    body: roleBody,
    json: true,
  }, (error, res) => {
    if (!error && res.statusCode === 201) {
      resolve(`role '${roleId}' added`);
    } else {
      reject(new Error('Couldn\'t add role'));
    }
  });
});


const updateRole = async (
  iamToken, roleId, roleName, rolePermissions, iamUrl,
) => new Promise((resolve, reject) => {
  const url = `${iamUrl}/api/v1/roles/${roleId}`;
  const roleBody = {
    name: roleName,
    permissions: rolePermissions,
  };
  request({
    uri: url,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${iamToken}`,
    },
    body: roleBody,
    json: true,
  }, (error, res) => {
    if (!error && res.statusCode === 200) {
      resolve(`role '${roleId}' updated`);
    } else {
      reject(new Error('Couldn\'t update role'));
    }
  });
});

const getRole = async (
  iamToken, iamUrl, roleId,
) => new Promise((resolve, reject) => {
  const url = `${iamUrl}/api/v1/roles/${roleId}`;
  request({
    uri: url,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${iamToken}`,
    },
  }, (error, res, body) => {
    if (!error && res.statusCode === 200) {
      resolve(JSON.parse(body));
    } else if (res.statusCode === 404) {
      resolve(true);
    } else {
      reject(new Error('Couldn\'t fetch role from iam-service'));
    }
  });
});

function arraysEqual(rolePermissions, newPermissions) {
  if (rolePermissions === newPermissions) return true;
  if (rolePermissions == null || newPermissions == null) return false;
  if (rolePermissions.length !== newPermissions.length) return false;

  for (let i = 0; i < rolePermissions.length; i += 1) {
    if (rolePermissions[i] !== newPermissions[i]) return false;
  }
  return true;
}

const setupRoles = async (roles, systemId, iamToken, iamUrl) => {
  const promises = [];
  roles.forEach((role) => {
    const roleId = `${systemId}.${role.name}`;
    const roleName = role.desc;
    const rolePermissions = role.permissions.map((p) => `${systemId}.${p}`);

    core.info(`fetching data for ${roleId}`);
    promises.push(getRole(iamToken, iamUrl, roleId).then((roleResult) => {
      if (roleResult === true) {
        core.info(`creating ${roleId}`);
        return createRole(iamToken, roleId, roleName, rolePermissions, iamUrl)
          .then((message) => core.info(message));
      }
      if (!arraysEqual(roleResult.permissions, rolePermissions) || roleResult.name !== roleName) {
        core.info(`updating ${roleId}`);
        return updateRole(iamToken, roleId, roleName, rolePermissions, iamUrl)
          .then((message) => core.info(message));
      }
      return null;
    }));
  });
  return Promise.all(promises);
};

module.exports = {
  setupRoles, getRole, createRole, updateRole, arraysEqual,
};
