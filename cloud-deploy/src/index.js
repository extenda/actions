const core = require('@actions/core');
const buildManifest = require('./manifests/build-manifest');
const loadServiceDefinition = require('./utils/service-definition');
const deploy = require('./manifests/deploy');
const projectInfo = require('../../cloud-run/src/project-info');
const createExternalLoadbalancer = require('./loadbalancing/external/create-external-loadbalancer');
const configureInternalDomain = require('./loadbalancing/internal/create-internal-backend');
const configureExternalDomain = require('./loadbalancing/external/create-external-backend');
const configureExternalLBFrontend = require('./loadbalancing/external/create-external-frontend');
const configureInternalFrontend = require('./loadbalancing/internal/create-internal-frontend');
const { run } = require('../../utils');
const setupGcloud = require('../../setup-gcloud-base/src/setup-gcloud');
const readSecret = require('./utils/load-credentials');

const action = async () => {
  const serviceAccountKeyPipeline = core.getInput('secrets-account-key', { required: true });
  const serviceAccountKeyCICD = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'cloud-deploy.yaml';
  const image = core.getInput('image', { required: true });
  const updateDns = core.getInput('update-dns');

  // Only migrate DNS if explicitly set to always.
  const migrate = updateDns === 'always';

  // const verbose = (core.getInput('verbose') || 'false');

  // failIfNotTrunkBased();
  const projectID = await setupGcloud(serviceAccountKeyCICD);

  const {
    project: clanName,
    env,
  } = projectInfo(projectID);

  const styraToken = await readSecret(serviceAccountKeyPipeline, env, 'styra-das-token', 'STYRA_TOKEN');
  const http2Certificate = await readSecret(serviceAccountKeyPipeline, env, 'envoy-http2-certs', 'HTTPS_CERTIFICATES');
  const internalHttpsCertificateKey = await readSecret(serviceAccountKeyPipeline, env, 'internal-https-certs-key', 'INTERNAL_HTTPS_CERTIFICATES_KEY');
  const internalHttpsCertificateCrt = await readSecret(serviceAccountKeyPipeline, env, 'internal-https-certs-crt', 'INTERNAL_HTTPS_CERTIFICATES_CRT');

  const deployYaml = loadServiceDefinition(serviceFile);
  const {
    kubernetes,
    environments,
  } = deployYaml;

  const {
    timeout = 300,
    service: serviceName,
    protocol,
  } = kubernetes;

  const {
    staging,
    production,
  } = environments;

  const {
    'domain-mappings': domainMappings,
  } = env === 'staging' ? staging : production;

  // setup manifests (hpa, deploy, negs)
  const version = new Date().getTime();
  await buildManifest(
    image,
    deployYaml,
    projectID,
    clanName,
    env,
    styraToken,
    http2Certificate,
    internalHttpsCertificateCrt,
    internalHttpsCertificateKey,
  );
  const succesfullDeploy = await deploy(projectID, serviceName, version);

  if (succesfullDeploy) {
    await createExternalLoadbalancer(projectID, env);
    if (domainMappings) {
      await configureExternalLBFrontend(projectID, env, domainMappings, migrate);
      await configureExternalDomain(projectID, serviceName, env, domainMappings, protocol, timeout);
    }
    await configureInternalDomain(projectID, serviceName, env, protocol, timeout);
    await configureInternalFrontend(projectID, serviceName, env, protocol);
  } else {
    throw new Error('Deployment failed! Check container logs and status for error!');
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
