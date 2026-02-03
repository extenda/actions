import * as core from '@actions/core';
import axios from 'axios';

import { iamApiErrorToString } from './utils/iam-api-error-to-string.js';

const updateAddPermission = async (
  iamToken,
  permissionId,
  permissionDesc,
  method,
  iamUrl,
  permissionAlias,
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
  })
    .then(() => {
      core.info(`permission '${permissionId}' ${action}d.`);
    })
    .catch((err) => {
      throw new Error(
        iamApiErrorToString(
          err,
          `Failed to ${action} permission ${permissionId}`,
        ),
      );
    });
};

const getPermission = async (
  iamToken,
  permissionId,
  permissionDesc,
  iamUrl,
  permissionAlias,
) =>
  axios({
    url: `${iamUrl}/api/v1/permissions/${permissionId}`,
    method: 'GET',
    headers: {
      authorization: `Bearer ${iamToken}`,
    },
  })
    .then((response) => {
      const { description, alias } = response.data;
      return description === permissionDesc && alias === permissionAlias
        ? 'NONE'
        : 'PUT';
    })
    .catch((err) => {
      if (err.response.status === 404) {
        return 'POST';
      }
      throw new Error(
        iamApiErrorToString(err, `Could not fetch permission ${permissionId}`),
      );
    });

const handlePermissions = async (fullPermissions, iamToken, iamUrl) => {
  // Split permissions into chunks of 10 to not overload IAM with too many concurrent requests.
  const chunks = [new Map()];
  const chunkSize = 10;
  let chunkIndex = 0;
  fullPermissions.forEach((value, key) => {
    if (chunks[chunkIndex].size >= chunkSize) {
      chunks[(chunkIndex += 1)] = new Map();
    }
    chunks[chunkIndex].set(key, value);
  });

  const promises = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const it = chunks[i][Symbol.iterator]();
    for (const [id, { description, alias }] of it) {
      core.info(`handling permission for '${id}'`);
      promises.push(
        getPermission(iamToken, id, description, iamUrl, alias).then(
          (status) => {
            if (status !== 'NONE') {
              core.info(`permission '${id}' require update (${status})`);
              return updateAddPermission(
                iamToken,
                id,
                description,
                status,
                iamUrl,
                alias,
              );
            }
            core.info(`permission '${id}' exists`);
            return null;
          },
        ),
      );
      // Complete the chunk.

      await Promise.all(promises);
    }
  }

  // We wait here to make sure we resolve all promises that updates permissions.
  await Promise.all(promises);
  core.info('All permissions processed.');
  return null;
};

const setupPermissions = async (permissions, systemId) => {
  const fullPermissions = new Map();
  Object.keys(permissions).forEach((noun) => {
    Object.values(permissions[noun]).forEach((verb) => {
      if (typeof verb === 'string') {
        const id = `${systemId}.${noun}.${verb}`;
        fullPermissions.set(id, { description: '' });
      } else {
        const id = `${systemId}.${noun}.${verb.id}`;
        const { alias, description } = verb;
        fullPermissions.set(id, { description, alias });
      }
    });
  });
  return fullPermissions;
};

export { handlePermissions, setupPermissions };
