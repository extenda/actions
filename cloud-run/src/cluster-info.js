import * as core from '@actions/core';

import gcloud from './gcloud-output.js';

const getTribeProject = async (projectId) => {
  const projectChunks = projectId.split('-');
  const suffix = projectChunks.includes('staging') ? '-staging' : '-prod';
  core.debug(`Search for GCP project with name suffix ${suffix}`);
  const output = await gcloud([
    '--quiet',
    'projects',
    'list',
    `--filter=NAME~${suffix}$ AND PROJECT_ID!=${projectId}`,
    '--format=value(PROJECT_ID)',
  ]);
  const projects = output
    .split('\n')
    .filter((s) => s && !s.startsWith('hiidentity-'));
  if (projects.length === 0) {
    throw new Error(
      `Could not find GKE project with suffix ${suffix}, or missing permissions to list it.`,
    );
  }
  if (projects.length > 1) {
    throw new Error(
      `There is more than one project with suffix ${suffix}, can't determine which one is tribe project`,
    );
  }
  const tribeProject = projects[0];
  core.info(`Found project ${tribeProject}`);
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
  if (
    cluster &&
    cluster.includes('projects/') &&
    cluster.includes('zones/') &&
    cluster.includes('clusters/')
  ) {
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

export { getClusterInfo, getTribeProject };
