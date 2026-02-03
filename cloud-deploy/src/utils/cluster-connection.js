import execGcloud from './gcloud-output.js';

const connectToCluster = async (clanName, env, projectID) =>
  execGcloud([
    'container',
    'clusters',
    'get-credentials',
    `${clanName}-cluster-${env}`,
    '--region=europe-west1',
    `--project=${projectID}`,
  ]);

export default connectToCluster;
