const core = require('@actions/core');
const { setupGroupTypes } = require('./grouptypes');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');

const configureGroupTypes = async (
  groupTypes, bumUrl, iamToken, projectId, skipBum,
) => {
  const {
    name,
    grouptypes,
  } = groupTypes;

  core.info('Connection and authenticating');
  const cluster = await getClusterInfo(projectId);
  // Connect to cluster
  await authenticateKubeCtl(cluster);

  // Next, update business unit system
  if (!skipBum) {
    return setupGroupTypes(grouptypes, name, iamToken, bumUrl);
  }
  return null;
};

module.exports = configureGroupTypes;
