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

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const setupRoles = async (roles, systemId, iamToken, iamUrl) => {
  roles.forEach(async (role) => {
    const roleId = `${systemId}.${role.name}`;
    const roleName = role.desc;
    const rolePermissions = role.permissions;

    for (let i = 0; i < rolePermissions.length; i += 1) {
      rolePermissions[i] = `${systemId}.${rolePermissions[i]}`;
    }

    const roleResult = await getRole(iamToken, iamUrl, roleId);
    if (roleResult === true) {
      await createRole(iamToken, roleId, roleName, rolePermissions, iamUrl)
        .then((message) => core.info(message));
    } else if (
      !arraysEqual(roleResult.permissions, rolePermissions)
        || roleResult.name !== roleName) {
      await updateRole(iamToken, roleId, roleName, rolePermissions, iamUrl)
        .then((message) => core.info(message));
    }
  });
};

module.exports = setupRoles;
