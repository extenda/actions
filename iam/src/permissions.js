const core = require('@actions/core');
const axios = require('axios');

const updateAddPermission = async (
  iamToken, permissionId, permissionDesc, method, iamUrl,
) => {
  let url = `${iamUrl}/api/v1/permissions`;
  const data = {
    description: permissionDesc,
  };
  if (method !== 'PUT') {
    data.id = permissionId;
  } else {
    url += `/${permissionId}`;
  }
  return axios({
    url,
    method,
    headers: {
      authorization: `Bearer ${iamToken}`,
      'content-type': 'application/json',
    },
    data,
  }).then((response) => {
    if (response.status === 200) {
      core.info(`permission '${permissionId}' created.`);
    } else {
      core.info(`permission '${permissionId}' updated.`);
    }
  }).catch((err) => {
    throw new Error(`Failed to create/update permission ${permissionId}. Reason: ${err.message} ${err.response.data.error || ''}`);
  });
};

const getPermission = async (
  iamToken, permissionId, permissionDesc, iamUrl,
) => axios({
  url: `${iamUrl}/api/v1/permissions/${permissionId}`,
  method: 'GET',
  headers: {
    authorization: `Bearer ${iamToken}`,
  },
}).then((response) => {
  const { description = null } = response.data;
  return description === permissionDesc ? 'NONE' : 'PUT';
}).catch((err) => {
  if (err.response.status === 404) {
    return 'POST';
  }
  throw new Error(`Could not fetch permissions from iam-service. Reason: ${err.message} ${err.response.data.error || ''}`);
});

const handlePermissions = async (fullPermissions, iamToken, iamUrl) => {
  const promises = [];
  fullPermissions.forEach((desc, id) => {
    core.info(`handling permission for '${id}'`);
    promises.push(getPermission(iamToken, id, desc, iamUrl)
      .then((status) => {
        if (status !== 'NONE') {
          core.info(`permission '${id}' require update (${status})`);
          return updateAddPermission(iamToken, id, desc, status, iamUrl);
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
  Object.keys(permissions).forEach((permission) => {
    Object.values(permissions[permission]).forEach((verb) => {
      const id = `${systemId}.${permission}.${verb}`;
      const description = '';
      fullPermissions.set(id, description);
    });
  });
  return fullPermissions;
};

module.exports = { setupPermissions, handlePermissions };
