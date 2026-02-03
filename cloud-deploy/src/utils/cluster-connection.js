import execGcloud from './gcloud-output';

const connectToCluster = async (clanName, env, projectID) =>
  execGcloud([
    'container',
    'clusters',
    'get-credentials',
    `${clanName}-cluster-${env}`,
    '--region=europe-west1',
    `--project=${projectID}`,
  ]);

module.exports = connectToCluster;
