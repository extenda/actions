const core = require('@actions/core');
const gcloud = require('./gcloud-output');

const getTribeProject = async (projectId) => {
  const projectChunks = projectId.split('-');
  const tribe = projectChunks[0];
  const env = projectChunks.includes('staging') ? 'staging' : 'prod';
  const tribeProjectName = `${tribe}-${env}`;

  core.info(`Search for GCP project with name ${tribeProjectName}`);
  const tribeProject = await gcloud([
    '--quiet',
    'projects',
    'list',
    `--filter=NAME:${tribeProjectName}`,
    '--format=value(PROJECT_ID)',
  ]);

  if (!tribeProject) {
    throw new Error(`Could not find project ${tribeProjectName}, or missing permissions to list it.`);
  }
  return tribeProject;
};

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

  if (cluster) {
    // A cluster is specified. It should exist in this project.
    return getClusterDetails(projectId, cluster);
  }

  // Nothing specified, find the cluster in tribe project.
  const tribeProject = await getTribeProject(projectId);
  return getClusterDetails(tribeProject, cluster);
};

module.exports = getClusterInfo;
