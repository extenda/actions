const core = require('@actions/core');
const gcloud = require('./gcloud-output');

const getClusterDetails = async (project, cluster) => {
  const args = [
    '--quiet',
    'container',
    'clusters',
    'list',
    `--project=${project}`,
    '--format=value(NAME,LOCATION)',
  ];
  if (cluster) {
    args.push(`--filter='NAME:${cluster}'`);
  }
  const clusterInfo = await gcloud(args);
  if (!clusterInfo) {
    throw new Error(`Failed to find a GKE cluster in ${project}.`);
  }
  const [clusterName, zone] = clusterInfo.split(/\s+/);
  return {
    project,
    cluster: clusterName,
    clusterLocation: zone,
    uri: `projects/${project}/zones/${zone}/clusters/${clusterName}`,
  };
};

const getClusterInfo = async (projectId, cluster = '') => {
  if (cluster && cluster.includes('projects/') && cluster.includes('zones/') && cluster.includes('clusters/')) {
    // Cluster is already fully qualified
    const info = cluster.split('/');
    return {
      project: info[1],
      cluster: info[5],
      clusterLocation: info[3],
      uri: cluster,
    };
  }
  return getClusterDetails(projectId, cluster);

};

module.exports = {
  getClusterInfo,
  getClusterDetails,
};
