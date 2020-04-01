// eslint-disable-next-line no-unused-vars
const core = require('@actions/core');
// eslint-disable-next-line no-unused-vars
const exec = require('@actions/exec');

// eslint-disable-next-line no-unused-vars
const createNamespace = async ({ project, cluster, clusterLocation }, namespace) => {
  // TODO Create namespace if it doesn't exist and label it for OPA and CloudRun.
  // kubectl create namespace <namespace>
  // kubectl label namespace <namespace> opa-istio-injection="enabled"
  // kubectl label namespace <namespace> istio-injection="enabled"
  // We must also apply configMaps for OPA

  // // Authenticate kubectl
  // exec.exec('gcloud', [
  //   'container',
  //   'clusters',
  //   'get-credentials',
  //   cluster,
  //   `--region=${clusterLocation}`,
  //   `--project=${project}`,
  // ]);
  // List namespace.
};

module.exports = createNamespace;
