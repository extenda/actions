import * as core from '@actions/core';
import axios from 'axios';

import { iamApiErrorToString } from './utils/iam-api-error-to-string.js';

const createRole = async (
  iamToken,
  roleId,
  roleName,
  rolePermissions,
  roleFixedBindings,
  iamUrl,
) =>
  axios({
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
      fixedBindings: roleFixedBindings,
    },
  })
    .then(() => {
      const message = `role '${roleId}' added`;
      core.info(message);
      return message;
    })
    .catch((err) => {
      throw new Error(
        iamApiErrorToString(err, `Couldn't add role '${roleId}'`),
      );
    });

const updateRole = async (
  iamToken,
  roleId,
  roleName,
  rolePermissions,
  roleFixedBindings,
  iamUrl,
) =>
  axios({
    url: `${iamUrl}/api/v1/roles/${roleId}`,
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${iamToken}`,
    },
    data: {
      name: roleName,
      permissions: rolePermissions,
      fixedBindings: roleFixedBindings,
    },
  })
    .then(() => {
      const message = `role '${roleId}' updated`;
      core.info(message);
      return message;
    })
    .catch((err) => {
      throw new Error(
        iamApiErrorToString(err, `Couldn't update role '${roleId}'`),
      );
    });

const getRole = async (iamToken, iamUrl, roleId) =>
  axios({
    url: `${iamUrl}/api/v1/roles/${roleId}`,
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${iamToken}`,
    },
  })
    .then((response) => response.data)
    .catch((err) => {
      if (err.response.status === 404) {
        return true;
      }
      throw new Error(
        iamApiErrorToString(
          err,
          `Could not fetch role from iam-service by id ${roleId}`,
        ),
      );
    });

function arraysEqual(rolePermissions, newPermissions) {
  if (rolePermissions === newPermissions) return true;
  if (rolePermissions == null || newPermissions == null) return false;
  if (rolePermissions.length !== newPermissions.length) return false;

  for (const index in rolePermissions) {
    if (rolePermissions[index] !== newPermissions[index]) return false;
  }
  return true;
}

const setupRoles = async (roles, systemId, iamToken, iamUrl) => {
  const promises = [];
  roles.forEach((role) => {
    const roleId = `${systemId}.${role.id}`;
    const roleName = role.name;
    const rolePermissions = role.permissions.map((permissionId) =>
      createPermissionId(systemId, permissionId),
    );
    const roleFixedBindings = role['fixed-bindings'];

    core.info(`fetching data for ${roleId}`);
    promises.push(
      getRole(iamToken, iamUrl, roleId).then((roleResult) => {
        if (roleResult === true) {
          core.info(`creating role '${roleId}'`);
          return createRole(
            iamToken,
            roleId,
            roleName,
            rolePermissions,
            roleFixedBindings,
            iamUrl,
          ).then((message) => core.info(message));
        }
        if (
          !arraysEqual(roleResult.permissions, rolePermissions) ||
          !arraysEqual(roleResult.fixedBindings, roleFixedBindings) ||
          roleResult.name !== roleName
        ) {
          core.info(`updating role '${roleId}'`);
          return updateRole(
            iamToken,
            roleId,
            roleName,
            rolePermissions,
            roleFixedBindings,
            iamUrl,
          ).then((message) => core.info(message));
        }
        core.info(`role '${roleId} exists`);
        return null;
      }),
    );
  });

  // We wait here to ensure we resolve all role promises before returning
  await Promise.all(promises);
  core.info('All roles processed');
};

/**
 * @param systemId {string}
 * @param permission {string}
 */
function createPermissionId(systemId, permissionId) {
  return isFullyQualifiedPermissionId(permissionId)
    ? permissionId
    : `${systemId}.${permissionId}`;
}

/** @param permission {string} */
function isFullyQualifiedPermissionId(permissionId) {
  return permissionId.split('.').length === 3;
}

export { arraysEqual, createRole, getRole, setupRoles, updateRole };
