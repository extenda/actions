const request = require('request');
const core = require('@actions/core');
const { arraysEqual } = require('./roles');
const { updateOwners } = require('./create-system');

const getOwners = async (systemId, token, styraUrl) => new Promise((resolve, reject) => {
  const url = `${styraUrl}/v1/authz/rolebindings/systems/${systemId}/owners`;
  request({
    uri: url,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
  }, (error, res, body) => {
    if (error) {
      reject(new Error(error));
    } else {
      resolve(JSON.parse(body).result.subjects);
    }
  });
});

const checkOwners = async (
  systemId,
  token,
  styraUrl,
  clanMembers,
) => getOwners(systemId, token, styraUrl)
  .then((currentOwners) => {
    if (!arraysEqual(currentOwners, clanMembers)) {
      core.info('Difference found on clan members, updating system owners..');
      return updateOwners(systemId, token, styraUrl, clanMembers);
    }
    return null;
  });

module.exports = checkOwners;
