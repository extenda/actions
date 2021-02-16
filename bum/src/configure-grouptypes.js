const core = require('@actions/core');
const { setupGroupTypes } = require('./grouptypes');

const configureGroupTypes = async (
  groupTypes, bumUrl, iamToken, projectId, skipBum,
) => {
  const {
    name,
    grouptypes,
  } = groupTypes;

  core.info('Setting up group types');

  // Next, update business unit system
  if (!skipBum) {
    return setupGroupTypes(grouptypes, name, iamToken, bumUrl);
  }
  return null;
};

module.exports = configureGroupTypes;
