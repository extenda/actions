import * as exec from '@actions/exec';

const authenticateKubeCtl = async ({ cluster, clusterLocation, project }) =>
  exec.exec('gcloud', [
    'container',
    'clusters',
    'get-credentials',
    cluster,
    `--region=${clusterLocation}`,
    `--project=${project}`,
  ]);

export default authenticateKubeCtl;
