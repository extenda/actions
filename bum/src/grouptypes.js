const core = require('@actions/core');
const axios = require('axios');

const createGroupType = async (
  iamToken, groupTypeId, groupTypeName, groupTypeDescription, bumUrl,
) => axios({
  url: `${bumUrl}/api/v1/grouptypes`,
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${iamToken}`,
  },
  data: {
    id: groupTypeId,
    name: groupTypeName,
    description: groupTypeDescription,
  },
}).then(() => {
  const message = `groupType '${groupTypeId}' added`;
  core.info(message);
  return message;
}).catch((err) => {
  throw new Error(`Couldn't add groupType '${groupTypeId}'. Reason: ${err.message} ${err.response.data.error || ''}`);
});


const updateGroupType = async (
  iamToken, groupTypeId, groupTypeName, groupTypeDescription, bumUrl,
) => axios({
  url: `${bumUrl}/api/v1/grouptypes`,
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${iamToken}`,
  },
  data: {
    id: groupTypeId,
    name: groupTypeName,
    description: groupTypeDescription,
  },
}).then(() => {
  const message = `groupType '${groupTypeId}' updated`;
  core.info(message);
  return message;
}).catch((err) => {
  throw new Error(`Couldn't update groupType '${groupTypeId}'. Reason: ${err.message} ${err.response.data.error || ''}`);
});

const getGroupType = async (
  iamToken, bumUrl, groupTypeId,
) => axios({
  url: `${bumUrl}/api/v1/grouptypes/${groupTypeId}`,
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
    throw new Error(`Could not fetch groupType from bum-service. Reason: ${err.message} ${err.response.data.error || ''}`);
  });

const setupGroupTypes = async (groupTypes, owner, iamToken, bumUrl) => {
  const promises = [];
  groupTypes.forEach((groupType) => {
    core.info(`fetching data for ${groupType}`);
    promises.push(getGroupType(iamToken, bumUrl, groupType.id).then((groupTypeResult) => {
      if (groupTypeResult === true) {
        core.info(`creating grouptype '${groupType.id}'`);
        return createGroupType(iamToken, groupType.id, groupType.name,
          groupType.description, bumUrl)
          .then((message) => core.info(message));
      }
      if (groupTypeResult === undefined || groupTypeResult.name !== groupType.name
        || groupTypeResult.description !== groupType.description) {
        core.info(`updating groupType '${groupType.id}'`);
        return updateGroupType(iamToken, groupType.id, groupType.name,
          groupType.description, bumUrl)
          .then((message) => core.info(message));
      }
      core.info(`groupType '${groupType.id} exists`);
      return null;
    }));
  });

  // We wait here to ensure we resolve all groupType promises before returning
  await Promise.all(promises);
  core.info('All groupTypes processed');
};

module.exports = {
  setupGroupTypes, getGroupType, createGroupType, updateGroupType,
};
