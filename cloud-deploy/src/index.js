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
const { run, failIfNotTrunkBased } = require('../../utils');
const { setupGcloud } = require('../../setup-gcloud');
const readSecret = require('./utils/load-credentials');
const runScan = require('./utils/vulnerability-scanning');
const getImageWithSha256 = require('./manifests/image-sha256');
const publishPolicies = require('./policies/publish-policies');

const action = async () => {
  const serviceAccountKeyPipeline = core.getInput('secrets-account-key', { required: true });
  const serviceAccountKeyCICD = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'cloud-deploy.yaml';
  const userImage = core.getInput('image', { required: true });
  const updateDns = core.getInput('update-dns');

  // Only migrate DNS if explicitly set to always.
  const migrate = `${updateDns}`.trim().toLowerCase() === 'always';
  core.info(`update-dns set to '${updateDns}' results in migrate=${migrate}`);

  // const verbose = (core.getInput('verbose') || 'false');

  failIfNotTrunkBased();

  // Ensure our gcloud is available and installed.
  const projectID = await setupGcloud(serviceAccountKeyCICD);

  const {
    project: clanName,
    env,
  } = projectInfo(projectID);

  const http2Certificate = await readSecret(serviceAccountKeyPipeline, env, 'envoy-http2-certs', 'HTTPS_CERTIFICATES');
  const internalHttpsCertificateKey = await readSecret(serviceAccountKeyPipeline, env, 'internal-https-certs-key', 'INTERNAL_HTTPS_CERTIFICATES_KEY');
  const internalHttpsCertificateCrt = await readSecret(serviceAccountKeyPipeline, env, 'internal-https-certs-crt', 'INTERNAL_HTTPS_CERTIFICATES_CRT');
  await readSecret(serviceAccountKeyPipeline, env, 'sec-launchdarkly-sdk-key', 'SEC_LAUNCHDARKLY_SDK_KEY');

  const deployYaml = loadServiceDefinition(serviceFile);
  const {
    'cloud-run': cloudrun,
    kubernetes,
    environments,
  } = deployYaml;

  const image = await getImageWithSha256(userImage);
  core.info(`Provided image ${userImage} resolved to ${image}`);

  const {
    timeout = 300,
    service: serviceName,
    protocol,
    'internal-traffic': internalTraffic = true,
  } = kubernetes || cloudrun;

  const {
    staging,
    production,
  } = environments;

  const {
    'domain-mappings': domainMappings,
  } = env === 'staging' ? staging : production;

  const platformGKE = !cloudrun;

  // Trivvy scanning
  if (process.platform !== 'win32') {
    if (env !== 'staging') {
      core.info('Run Trivy scanning');
      await runScan(serviceAccountKeyCICD, image);
    }
  }

  // setup manifests (hpa, deploy, negs)
  const version = new Date().getTime();

  core.info('Build manifests');
  await buildManifest(
    image,
    deployYaml,
    projectID,
    clanName,
    env,
    timeout,
    http2Certificate,
    internalHttpsCertificateCrt,
    internalHttpsCertificateKey,
    serviceAccountKeyCICD,
  );

  await publishPolicies(serviceName, env, (userImage.split(':')[1] || version), deployYaml);

  core.info('Run cloud-deploy');
  const succesfulDeploy = await deploy(projectID, serviceName, version, platformGKE);

  if (succesfulDeploy) {
    await createExternalLoadbalancer(projectID, env);
    if (domainMappings) {
      await configureExternalLBFrontend(projectID, env, [...domainMappings], migrate);
      await configureExternalDomain(
        projectID,
        serviceName,
        env,
        domainMappings,
        protocol,
        timeout,
        platformGKE,
      );
    }
    if (internalTraffic) {
      await configureInternalDomain(projectID, serviceName, env, protocol, timeout, platformGKE);
      await configureInternalFrontend(projectID, serviceName, env, protocol, platformGKE);
    }
  } else {
    throw new Error('Deployment failed! Check container logs and status for error!');
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
