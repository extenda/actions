const core = require('@actions/core');
const axios = require('axios');
const { iamApiErrorToString } = require('./utils/iam-api-error-to-string');

const updateAddPermission = async (
  iamToken, permissionId, permissionDesc, method, iamUrl, permissionAlias,
) => {
  let url = `${iamUrl}/api/v1/permissions`;
  const data = {
    description: permissionDesc,
    alias: permissionAlias,
  };
  if (method !== 'PUT') {
    data.id = permissionId;
  } else {
    url += `/${permissionId}`;
  }
  const action = method === 'PUT' ? 'update' : 'create';
  return axios({
    url,
    method,
    headers: {
      authorization: `Bearer ${iamToken}`,
      'content-type': 'application/json',
    },
    data,
  }).then(() => {
    core.info(`permission '${permissionId}' ${action}d.`);
  }).catch((err) => {
    throw new Error(iamApiErrorToString(err, `Failed to ${action} permission ${permissionId}`));
  });
};

const getPermission = async (
  iamToken, permissionId, permissionDesc, iamUrl, permissionAlias,
) => axios({
  url: `${iamUrl}/api/v1/permissions/${permissionId}`,
  method: 'GET',
  headers: {
    authorization: `Bearer ${iamToken}`,
  },
}).then((response) => {
  const { description = null, alias = null } = response.data;
  return description === permissionDesc || alias === permissionAlias ? 'NONE' : 'PUT';
}).catch((err) => {
  if (err.response.status === 404) {
    return 'POST';
  }
  throw new Error(iamApiErrorToString(err, `Could not fetch permission ${permissionId}`));
});

const handlePermissions = async (fullPermissions, iamToken, iamUrl) => {
  const promises = [];
  fullPermissions.forEach(({ description, alias }, id) => {
    core.info(`handling permission for '${id}'`);
    promises.push(getPermission(iamToken, id, description, iamUrl, alias)
      .then((status) => {
        if (status !== 'NONE') {
          core.info(`permission '${id}' require update (${status})`);
          return updateAddPermission(iamToken, id, description, status, iamUrl, alias);
        }
        core.info(`permission '${id}' exists`);
        return null;
      }));
  });

  // We wait here to make sure we resolve all promises that updates permissions.
  await Promise.all(promises);
  core.info('All permissions processed.');
};

const setupPermissions = async (permissions, systemId) => {
  const fullPermissions = new Map();
  Object.keys(permissions).forEach((noun) => {
    Object.values(permissions[noun]).forEach((verb) => {
      const description = '';
      if (typeof verb === 'string') {
        const id = `${systemId}.${noun}.${verb}`;
        fullPermissions.set(id, { description });
      } else {
        const id = `${systemId}.${noun}.${verb.id}`;
        const { alias } = verb;
        fullPermissions.set(id, { description, alias });
      }
    });
  });
  return fullPermissions;
};

module.exports = { setupPermissions, handlePermissions };
