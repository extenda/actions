const core = require('@actions/core');
const request = require('request');

const updateAddPermission = async (
  iamToken, permissionId, permissionDesc, method, iamUrl,
) => new Promise((resolve, reject) => {
  let url = `${iamUrl}/api/v1/permissions`;
  let permissionBody = {
    id: permissionId,
    description: permissionDesc,
  };
  if (method === 'PUT') {
    permissionBody = {
      description: permissionDesc,
    };
    url += `/${permissionId}`;
  }
  request({
    uri: url,
    method,
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${iamToken}`,
    },
    body: permissionBody,
    json: true,
  }, (error, res) => {
    if (!error && (res.statusCode === 201 || res.statusCode === 200)) {
      resolve(`permission '${permissionId}' updated/added`);
    } else {
      reject(new Error('Couldn\'t add/update permission'));
    }
  });
});

const getPermission = async (
  iamToken, permissionId, permissionDesc, iamUrl,
) => new Promise((resolve, reject) => {
  const url = `${iamUrl}/api/v1/permissions/${permissionId}`;
  request({
    uri: url,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${iamToken}`,
    },
  }, (error, res, body) => {
    if (!error && res.statusCode === 200) {
      const existingPermission = JSON.parse(body);
      if (existingPermission.description === permissionDesc) {
        resolve('NONE');
      }
      resolve('PUT');
    } else if (res.statusCode === 404) {
      resolve('POST');
    } else {
      reject(new Error('Couldn\'t fetch permissions from iam-service'));
    }
  });
});

const handlePermissions = async (fullPermissions, iamToken, iamUrl) => {
  fullPermissions.forEach(async (desc, id) => {
    getPermission(iamToken, id, desc, iamUrl)
      .then((status) => {
        if (status !== 'NONE') {
          updateAddPermission(iamToken, id, desc, status, iamUrl)
            .then((message) => core.info(message));
        }
      });
  });
};

const setupPermissions = async (permissions, systemId) => {
  const fullPermissions = new Map();
  for (const permission in permissions) {
    if (Object.prototype.hasOwnProperty.call(permission, permissions)) {
      for (const verb in permissions[permission]) {
        if (Object.prototype.hasOwnProperty.call(verb, permissions[permission])) {
          const id = `${systemId}.${permission}.${verb}`;
          const description = permissions[permission][verb];
          fullPermissions.set(id, description);
        }
      }
    }
  }
  return fullPermissions;
};

module.exports = { setupPermissions, handlePermissions };
