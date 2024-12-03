const core = require('@actions/core');
const buildManifest = require('./manifests/build-manifest');
const loadServiceDefinition = require('./utils/service-definition');
const deploy = require('./manifests/deploy');
const projectInfo = require('../../cloud-run/src/project-info');
const { run, failIfNotTrunkBased } = require('../../utils');
const { setupGcloud } = require('../../setup-gcloud');
const readSecret = require('./utils/load-credentials');
const runScan = require('./utils/vulnerability-scanning');
const getImageWithSha256 = require('./manifests/image-sha256');
const publishPolicies = require('./policies/publish-policies');
const checkPolicyExists = require('./utils/cloud-armor');
const {
  sendScaleSetup,
  sendDeployInfo,
  sendDeployRequest,
} = require('./utils/send-request');

const action = async () => {
  const serviceAccountKeyPipeline = core.getInput('secrets-account-key', {
    required: true,
  });
  const serviceAccountKeyCICD = core.getInput('service-account-key', {
    required: true,
  });
  const serviceFile =
    core.getInput('service-definition') || 'cloud-deploy.yaml';
  const userImage = core.getInput('image', { required: true });
  const updateDns = core.getInput('update-dns');

  // Only migrate DNS if explicitly set to always.
  const migrate = `${updateDns}`.trim().toLowerCase() === 'always';
  core.info(`update-dns set to '${updateDns}' results in migrate=${migrate}`);

  // const verbose = (core.getInput('verbose') || 'false');

  failIfNotTrunkBased();

  // Ensure our gcloud is available and installed.
  const projectID = await setupGcloud(serviceAccountKeyCICD, 'latest', true);

  const { project: clanName, env } = projectInfo(projectID);

  const http2Certificate = await readSecret(
    serviceAccountKeyPipeline,
    env,
    'envoy-http2-certs',
    'HTTPS_CERTIFICATES',
  );
  const internalHttpsCertificateKey = await readSecret(
    serviceAccountKeyPipeline,
    env,
    'internal-https-certs-key',
    'INTERNAL_HTTPS_CERTIFICATES_KEY',
  );
  const internalHttpsCertificateCrt = await readSecret(
    serviceAccountKeyPipeline,
    env,
    'internal-https-certs-crt',
    'INTERNAL_HTTPS_CERTIFICATES_CRT',
  );
  await readSecret(
    serviceAccountKeyPipeline,
    env,
    'sec-launchdarkly-sdk-key',
    'SEC_LAUNCHDARKLY_SDK_KEY',
  );

  const deployYaml = loadServiceDefinition(serviceFile);
  const {
    'cloud-run': cloudrun,
    kubernetes,
    environments,
    security,
  } = deployYaml;

  const image = await getImageWithSha256(userImage);
  core.info(`Provided image ${userImage} resolved to ${image}`);

  const {
    timeout = 300,
    service: serviceName,
    protocol,
    'internal-traffic': internalTraffic = true,
    scaling,
  } = kubernetes || cloudrun;

  const { staging, production } = environments;

  const { consumers, 'cloud-armor': cloudArmor } =
    security === 'none' ? {} : security || {};

  const { 'service-accounts': IAMServiceAccounts = [] } = consumers || {};

  const { 'policy-name': cloudArmorPolicy = undefined } = cloudArmor || {};

  if (!cloudrun && consumers) {
    throw new Error('Consumers security configuration is only for cloud-run');
  }

  // fail early if cloud armor policy doesn't exist
  if (cloudArmorPolicy) {
    await checkPolicyExists(cloudArmorPolicy, projectID);
  }

  const {
    'domain-mappings': domainMappings,
    'path-mappings': pathMappings = [],
    'min-instances': minInstances,
  } = env === 'staging' ? staging : production;

  const domainMappingsClone = [].concat(domainMappings);
  const platformGKE = !cloudrun;

  // Trivvy scanning
  if (process.platform !== 'win32') {
    if (env !== 'staging') {
      core.info('Run Trivy scanning');
      await runScan(serviceAccountKeyCICD, image, serviceName);
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

  await publishPolicies(
    serviceName,
    env,
    userImage.split(':')[1] || version,
    deployYaml,
  );

  core.info('Run cloud-deploy');
  const succesfulDeploy = await deploy(
    projectID,
    serviceName,
    version,
    platformGKE,
    IAMServiceAccounts,
  );

  if (succesfulDeploy) {
    // Setup scaling scheduler
    if (scaling.schedule && env === 'prod' && minInstances > 0) {
      const requests = [];
      for (const schedule of scaling.schedule) {
        // check region match once region is implemented
        const [scaleUp, scaleDown] = schedule['scale-hours'].split('-');
        requests.push(
          sendScaleSetup(
            serviceName,
            projectID,
            'europe-west1',
            platformGKE ? 'kubernetes' : 'cloudrun',
            minInstances,
            scaleUp,
            scaleDown,
          ),
        );
      }
      await Promise.all(requests);
    }
    // Send deploy information when deployed to production
    if (env === 'prod') {
      const requests = [];
      const timestamp = new Date().toISOString();
      const githubRepository = `https://github.com/${process.env.GITHUB_REPOSITORY}`;
      const githubSHA = process.env.GITHUB_SHA;
      const slackChannel = await readSecret(
        serviceAccountKeyCICD,
        env,
        'clan_slack_channel',
        'CLAN_SLACK_CHANNEL',
      );

      requests.push(
        sendDeployInfo(
          serviceName,
          timestamp,
          version,
          projectID,
          githubRepository,
          githubSHA,
          slackChannel,
        ),
      );

      await Promise.all(requests);
    }

    const deployData = {
      serviceName,
      projectID,
      platform: platformGKE ? 'kubernetes' : 'cloud-run',
      protocol,
      timeout,
      region: 'europe-west1',
      migrate,
      cloudArmorPolicy,
      internalTraffic,
      loggingSampleRate: 0,
      domainMappings: domainMappingsClone,
      pathMappings,
    };
    Object.keys(deployData).forEach((key) =>
      deployData[key] === undefined ? delete deployData[key] : {},
    );
    if (pathMappings) {
      for (const pathMap of pathMappings) {
        if (pathMap.service) {
          pathMap.target = `service/${pathMap.service}`;
          delete pathMap.service;
        }
        if (pathMap.bucket) {
          pathMap.target = `bucket/${pathMap.bucket}`;
          delete pathMap.bucket;
        }
        if (pathMap['path-rewrite']) {
          pathMap.rewrite = pathMap['path-rewrite'];
          delete pathMap['path-rewrite'];
        }
      }
    }
    await sendDeployRequest(deployData);
  } else {
    throw new Error(
      'Deployment failed! Check container logs and status for error!',
    );
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
