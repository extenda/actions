const core = require('@actions/core');
const axios = require('axios');

const createRole = async (
  iamToken, roleId, roleName, rolePermissions, iamUrl,
) => axios({
  url: `${iamUrl}/api/v1/roles`,
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${iamToken}`,
  },
  data: {
    id: roleId,
    name: roleName,
    permissions: rolePermissions,
  },
}).then(() => {
  const message = `role '${roleId}' added`;
  core.info(message);
  return message;
}).catch((err) => {
  throw new Error(`Couldn't add role '${roleId}'. Reason: ${err.message} ${err.response.data.error || ''}`);
});


const updateRole = async (
  iamToken, roleId, roleName, rolePermissions, iamUrl,
) => axios({
  url: `${iamUrl}/api/v1/roles/${roleId}`,
  method: 'PUT',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${iamToken}`,
  },
  data: {
    name: roleName,
    permissions: rolePermissions,
  },
}).then(() => {
  const message = `role '${roleId}' updated`;
  core.info(message);
  return message;
}).catch((err) => {
  throw new Error(`Couldn't update role '${roleId}'. Reason: ${err.message} ${err.response.data.error || ''}`);
});

const getRole = async (
  iamToken, iamUrl, roleId,
) => axios({
  url: `${iamUrl}/api/v1/roles/${roleId}`,
  method: 'GET',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${iamToken}`,
  },
}).then((response) => response.data)
  .catch((err) => {
    if (err.response.status === 404) {
      return true;
    }
    throw new Error(`Could not fetch role from iam-service. Reason: ${err.message} ${err.response.data.error || ''}`);
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
    const roleId = `${systemId}.${role.id}`;
    const roleDesc = role.desc;
    const rolePermissions = role.permissions.map((p) => `${systemId}.${p}`);

    core.info(`fetching data for ${roleId}`);
    promises.push(getRole(iamToken, iamUrl, roleId).then((roleResult) => {
      if (roleResult === true) {
        core.info(`creating role '${roleId}'`);
        return createRole(iamToken, roleId, roleDesc, rolePermissions, iamUrl)
          .then((message) => core.info(message));
      }
      if (!arraysEqual(roleResult.permissions, rolePermissions) || roleResult.name !== roleDesc) {
        core.info(`updating role '${roleId}'`);
        return updateRole(iamToken, roleId, roleDesc, rolePermissions, iamUrl)
          .then((message) => core.info(message));
      }
      core.info(`role '${roleId} exists`);
      return null;
    }));
  });

  // We wait here to ensure we resolve all role promises before returning
  await Promise.all(promises);
  core.info('All roles processed');
};

module.exports = {
  setupRoles, getRole, createRole, updateRole, arraysEqual,
};
